// Countdown: 45 minuti dalla prima apertura della pagina.
// Il tempo di partenza è salvato in sessionStorage così un refresh
// non fa "ripartire" i 45 minuti da capo.
(function () {
  const DURATION_MS = 45 * 60 * 1000;
  const STORAGE_KEY = "lspd_bando_start";

  const clockEl = document.getElementById("clock");
  const countdownEl = document.getElementById("countdown");
  const formWrap = document.getElementById("formWrap");
  const formFrame = document.getElementById("formFrame");
  const formClosed = document.getElementById("formClosed");

  if (!clockEl) return; // non siamo nella pagina del bando

  let startTime = sessionStorage.getItem(STORAGE_KEY);
  if (!startTime) {
    startTime = Date.now();
    sessionStorage.setItem(STORAGE_KEY, startTime);
  } else {
    startTime = parseInt(startTime, 10);
  }

  function closeForm() {
    formFrame.style.display = "none";
    formClosed.classList.add("active");
    clockEl.textContent = "00:00";
    countdownEl.classList.add("warn");
  }

  function tick() {
    const elapsed = Date.now() - startTime;
    const remaining = DURATION_MS - elapsed;

    if (remaining <= 0) {
      closeForm();
      clearInterval(timerId);
      return;
    }

    const totalSeconds = Math.floor(remaining / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    clockEl.textContent =
      String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");

    if (minutes < 5) countdownEl.classList.add("warn");
  }

  tick();
  const timerId = setInterval(tick, 1000);
})();
