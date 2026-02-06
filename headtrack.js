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

  async function start() {
    if (state.started) return;
    state.started = true;

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

      // Nose tip landmark
      const nose = lm[1];
      if (!nose) return;

      // ✅ FIX: invert mirror so RIGHT head movement = RIGHT screen movement
      const x = 1 - nose.x;

      const xNorm = clamp(x, 0, 1);
      const center = 0.5;
      const delta = xNorm - center;

      const threshold = 0.06; // sensitivity
      let side = "CENTER";
      if (delta > threshold) side = "RIGHT";
      else if (delta < -threshold) side = "LEFT";

      // confidence: further from center = more confident
      const confidence = clamp(Math.abs(delta) / 0.20, 0, 1);

      if (side !== "CENTER") state.lastSide = side;

      // If centered, keep lastSide for stability
      const stableSide = side === "CENTER" ? state.lastSide : side;

      emit(stableSide, confidence, xNorm);
    });

    const cam = new Camera(video, {
      onFrame: async () => {
        await faceMesh.send({ image: video });
      },
      width: 640,
      height: 480
    });

    await cam.start();
  }

  window.HeadTrack = { start };
})();
