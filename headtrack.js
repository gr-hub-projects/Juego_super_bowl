(function () {
  const video = document.getElementById("video");

  const state = {
    started: false,
    lastSide: null,
  };

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  // Lanza evento custom
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

      // Landmark nariz aproximado: 1 (tip) suele funcionar bien
      const nose = lm[1];
      if (!nose) return;

      // nose.x viene normalizado 0..1 (izq a der)
      const x = nose.x;
      const xNorm = clamp(x, 0, 1);

      const center = 0.5;
      const delta = xNorm - center;

      // Umbral
      const threshold = 0.06; // ajustable
      let side = null;
      if (delta > threshold) side = "RIGHT";
      else if (delta < -threshold) side = "LEFT";
      else side = "CENTER";

      // confidence aproximada (mientras más lejos del centro, más seguro)
      const confidence = clamp(Math.abs(delta) / 0.20, 0, 1);

      emit(side === "CENTER" ? (state.lastSide ?? "LEFT") : side, confidence, xNorm);

      if (side !== "CENTER") state.lastSide = side;
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
