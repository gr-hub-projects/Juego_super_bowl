const scoreEl = document.getElementById("score");
const dirEl = document.getElementById("dir");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const winEl = document.getElementById("win");

const ball = document.getElementById("ball");
const player = document.getElementById("player");
const arena = document.getElementById("arena");

let score = 0;
let running = false;
let targetSide = null; // "LEFT" | "RIGHT"
let lock = false;

function arenaX(pct) {
  // pct: 0..1, limita dentro del arena
  const w = arena.clientWidth;
  const objW = 70; // aprox player width
  const x = Math.max(0, Math.min(w - objW, Math.floor(pct * (w - objW))));
  return x;
}

function setPositions(side) {
  const leftPct = 0.18;
  const rightPct = 0.70;

  const bpct = side === "LEFT" ? leftPct : rightPct;
  const ppct = bpct;

  ball.style.left = `${arenaX(bpct)}px`;
  // el jugador se mueve por headtracking; aquí lo dejamos “en centro” al inicio
}

function newRound() {
  targetSide = Math.random() < 0.5 ? "LEFT" : "RIGHT";
  dirEl.textContent = targetSide;
  setPositions(targetSide);
  lock = false;
}

function addPoint() {
  score += 1;
  scoreEl.textContent = String(score);

  if (score >= 7) {
    running = false;
    winEl.classList.remove("hidden");
  } else {
    newRound();
  }
}

startBtn.addEventListener("click", async () => {
  if (running) return;
  winEl.classList.add("hidden");
  score = 0;
  scoreEl.textContent = "0";
  running = true;

  await window.HeadTrack.start(); // inicializa cámara + tracking
  newRound();
});

restartBtn?.addEventListener("click", () => {
  winEl.classList.add("hidden");
  score = 0;
  scoreEl.textContent = "0";
  running = true;
  newRound();
});

// Recibe eventos de head tracking: { side: "LEFT"|"RIGHT", confidence: 0..1 }
window.addEventListener("headmove", (e) => {
  if (!running) return;
  if (!e.detail) return;

  const { side, confidence, xNorm } = e.detail;

  // mueve player suave por xNorm (0..1)
  player.style.left = `${arenaX(xNorm)}px`;

  // validación por lado (para contar punto)
  if (lock) return;
  if (confidence < 0.6) return;

  if (side === targetSide) {
    lock = true;
    addPoint();
  } else {
    // opcional: penalización o solo ignora
    // lock = true; setTimeout(()=> lock=false, 350);
  }
});
