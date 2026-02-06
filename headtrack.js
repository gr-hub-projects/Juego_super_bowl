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
    // Pide cámara con constraints compatibles
    const constraints = {
      audio: false,
      video: {
        facingMode: "user",
        width: { ideal: 640 },
        height: { ideal: 480 }
      }
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = stream;

      // Espera a que realmente haya video listo
      await new Promise((resolve) => {
        video.onloadedmetadata = () => resolve(true);
      });

      await video.play();
      return true;
    } catch (err) {
      // Mensajes típicos:
      // NotAllowedError -> permiso
      // NotReadableError -> cámara ocupada / no inicia
      // OverconstrainedError -> constraints incompatibles
      const name = err?.name || "CameraError";
      const msg = err?.message || String(err);

      alert(
        `Camera error: ${name}\n\n${msg}\n\n` +
        `Tips:\n- Cierra apps/pestañas que usen cámara (Teams/Zoom/Meet).\n` +
        `- Revisa permisos: candado > Camera > Allow.\n` +
        `- Abre el link directo en Chrome (no dentro de otra app).\n`
      );

      throw err;
    }
  }

  async function start() {
    if (state.started) return;
    state.started = true;

    // 1) Asegurar stream primero (más estable)
    await ensureCameraStream();

    // 2) Inicializar FaceMesh
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

      // ✅ FIX espejo: RIGHT de tu cabeza = RIGHT en pantalla
      const x = 1 - nose.x;

      const xNorm = clamp(x, 0, 1);
      const center = 0.5;
      const delta = xNorm - center;

      const threshold = 0.06;
      let side = "CENTER";
      if (delta > threshold) side = "RIGHT";
      else if (delta < -threshold) side = "LEFT";

      const confidence = clamp(Math.abs(delta) / 0.20, 0, 1);

      if (side !== "CENTER") state.lastSide = side;
      const stableSide = side === "CENTER" ? state.lastSide : side;

      emit(stableSide, confidence, xNorm);
    });

    // 3) Loop de frames (sin camera_utils) — usamos el stream ya activo
    async function loop() {
      if (!state.started) return;
      await faceMesh.send({ image: video });
      requestAnimationFrame(loop);
    }
    loop();
  }

  window.HeadTrack = { start };
})();
