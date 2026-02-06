(function () {
  const video = document.getElementById("video");

  const state = {
    started: false,
    lastSide: "LEFT",
  };

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function emit(side, confidence, xNorm) {
    window.dispatchEvent(new CustomEvent("headmove", {
      detail: { side, confidence, xNorm }
    }));
  }

  async function ensureCameraStream() {
    const constraints = {
      audio: false,
      video: {
        facingMode: "user",
        width: { ideal: 640 },
        height: { ideal: 480 }
      }
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;

    await new Promise((resolve) => {
      video.onloadedmetadata = () => resolve(true);
    });

    await video.play();
  }

  async function start() {
    if (state.started) return;
    state.started = true;

    await ensureCameraStream();

    const faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    faceMesh.onResults((results) => {
      if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) return;

      const lm = results.multiFaceLandmarks[0];
      const nose = lm[1];
      if (!nose) return;

      // ✅ FIX espejo
      const x = 1 - nose.x;

      const xNorm = clamp(x, 0, 1);
      const delta = xNorm - 0.5;

      const threshold = 0.06;
      let side = "CENTER";
      if (delta > threshold) side = "RIGHT";
      else if (delta < -threshold) side = "LEFT";

      const confidence = clamp(Math.abs(delta) / 0.20, 0, 1);

      if (side !== "CENTER") state.lastSide = side;
      const stableSide = side === "CENTER" ? state.lastSide : side;

      emit(stableSide, confidence, xNorm);
    });

    async function loop() {
      await faceMesh.send({ image: video });
      requestAnimationFrame(loop);
    }
    loop();
  }

  window.HeadTrack = { start };
})();
