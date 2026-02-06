const touchControls = document.getElementById("touchControls");
const btnLeft = document.getElementById("btnLeft");
const btnRight = document.getElementById("btnRight");

function simulateMove(side){
  if (!running) return;
  if (lock) return;
  if (side === targetSide){
    lock = true;
    addPoint();
  }
}

btnLeft?.addEventListener("click", ()=> simulateMove("LEFT"));
btnRight?.addEventListener("click", ()=> simulateMove("RIGHT"));

startBtn.addEventListener("click", async () => {
  if (running) return;

  winEl.classList.add("hidden");
  score = 0;
  scoreEl.textContent = "0";
  running = true;

  try {
    await window.HeadTrack.start(); // intenta cámara
    touchControls.classList.add("hidden");
  } catch (e) {
    // si falla cámara en el kiosk/app, activamos touch mode
    touchControls.classList.remove("hidden");
    dirEl.textContent = "TOUCH MODE";
  }

  player.style.left = `${arenaX(0.44)}px`;
  newRound();
});
