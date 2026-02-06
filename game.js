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
  const w = arena.clientWidth;
  const objW = 70; // player width
  const x = Math.max(0, Math.min(w - objW, Math.floor(pct * (w - objW))));
  return x;
}

function setBallPosition(side) {
  const leftPct = 0.18;
  const rightPct = 0.70;
  const bpct = side === "LEFT" ? leftPct : rightPct;
  ball.style.left = `${arenaX(bpct)}px`;
}

function newRound() {
  targetSide = Math.random() < 0.5 ? "LEFT" : "RIGHT";
  dirEl.textContent = targetSide;

  setBallPosition(targetSide);

  // little "ping" animation
  ball.style.transform = "scale(1.08)";
  setTimeout(() => (ball.style.transform = "scale(1)"), 120);

  lock = false;
}

function addPoint() {
  score += 1;
  scoreEl.textContent = String(score);

  if (score >= 7) {
    running = false;
    winEl.classList.remove("hidden");
    winEl.classList.add("touchdown");
    setTimeout(() => winEl.classList.remove("touchdown"), 800);
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

  await window.HeadTrack.start(); // cámara + tracking

  // start with player centered
  player.style.left = `${arenaX(0.44)}px`;

  newRound();
});

restartBtn?.addEventListener("click", () => {
  winEl.classList.add("hidden");
  score = 0;
  scoreEl.textContent = "0";
  running = true;
  newRound();
});

// Head tracking events: { side, confidence, xNorm }
window.addEventListener("headmove", (e) => {
  if (!running) return;
  if (!e.detail) return;

  const { side, confidence, xNorm } = e.detail;

  // move player smoothly by xNorm (0..1)
  player.style.left = `${arenaX(xNorm)}px`;

  // scoring
  if (lock) return;
  if (confidence < 0.6) return;

  if (side === targetSide) {
    lock = true;
    addPoint();
  }
});
