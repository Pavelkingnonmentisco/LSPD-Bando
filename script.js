// ============================================================
// LSPD — Bando: form nativo (nessun Google Form)
//
// ⚠️ DOMANDE SEGNAPOSTO: sostituisci l'array QUESTIONS qui sotto
// con le domande esatte del tuo bando. Ogni domanda ha:
//   id       -> identificativo univoco (usato anche come "name" del campo)
//   title    -> testo della domanda mostrato all'utente
//   type     -> "text" (risposta breve) | "textarea" (risposta lunga)
//               | "radio" (scelta singola, richiede "options")
//   required -> true/false
//   options  -> solo per "radio": array di stringhe
// ============================================================

const QUESTIONS = [
  { id: "discord_nome", title: "Nome Discord (ES: ilboss_02)", type: "text", required: true },
  { id: "discord_id", title: "ID utente Discord", type: "text", required: true },
  { id: "nome_rp", title: "Nome e cognome RP", type: "text", required: true },
  { id: "roblox_nome", title: "Nome Roblox (ES: pavelsingh2021)", type: "text", required: true },
  { id: "anni_irl", title: "Anni IRL (In vita reale)", type: "text", required: true },
  {
    id: "esperienze_ffoo",
    title:
      "Hai già avuto esperienze nelle FF.OO in altre situazioni (altri server, ERLC, FiveM, etc…)? Se sì, elencale in cosa. (OOC) Se nessuna scrivere N/A",
    type: "textarea",
    required: true,
  },
  { id: "motivazione", title: "Perché desideri entrare a far parte del LAPD?", type: "textarea", required: true },
  {
    id: "qualita",
    title: "Quali sono, secondo te, le qualità fondamentali di un buon agente di polizia?",
    type: "textarea",
    required: true,
  },
  { id: "giorno_compilazione", title: "Giorno di compilazione del bando", type: "date", required: true },

  { id: "sec_cultura", title: "Cultura", type: "section" },
  {
    id: "scoperta_america",
    title: "Quando viene scoperta l'America?",
    type: "radio_other",
    required: true,
    options: ["1402", "1490", "1492", "1453", "1494", "1455", "1449"],
  },
  { id: "presidente_attuale", title: "Chi è l'attuale presidente degli Stati Uniti d'America?", type: "text", required: true },
  {
    id: "dichiarazione_indipendenza",
    title: "In che anno è stata firmata la Dichiarazione d'Indipendenza degli Stati Uniti?",
    type: "radio_other",
    required: true,
    options: ["1723", "1764", "1776", "1780", "1772"],
  },
  { id: "primo_presidente", title: "Chi fu il primo presidente degli Stati Uniti?", type: "text", required: true },
  { id: "capitale_usa", title: "Qual è la capitale degli Stati Uniti?", type: "text", required: true },
  {
    id: "documento_diritti",
    title: "Qual è il documento che garantisce i diritti fondamentali negli USA?",
    type: "text",
    required: true,
  },

  { id: "sec_operativa", title: "Sezione Operativa", type: "section" },
  { id: "pressione", title: "Cosa fai se sei sotto pressione?", type: "textarea", required: true },
  {
    id: "suv_bloccati",
    title: "Cosa fai in caso 4 suv bloccano la strada sia davanti che dietro?",
    type: "textarea",
    required: true,
  },
  { id: "collega_sparato", title: "Cosa fai se un collega viene sparato?", type: "textarea", required: true },
  { id: "fermo_stradale", title: "Come si fa un fermo stradale?", type: "textarea", required: true },
  { id: "blocco_stradale", title: "Come si fa un blocco stradale?", type: "textarea", required: true },
  {
    id: "resistenza_verbale",
    title:
      "Durante un arresto, il sospettato oppone resistenza verbale ma non fisica. Come gestisci la situazione?",
    type: "textarea",
    required: true,
  },
  {
    id: "fermo_vs_arresto",
    title: "Quali sono le differenze tra stato di fermo e stato di arresto?",
    type: "textarea",
    required: true,
  },

  { id: "sec_finale", title: "Sezione Finale", type: "section" },
  { id: "sicuro_risposte", title: "Sei sicuro di tutte le risposte date?", type: "radio", required: true, options: ["Sì", "No"] },
  {
    id: "no_ai",
    title: "Sai vero che se hai usato l'AI verrai rifiutato all'istante?",
    type: "radio",
    required: true,
    options: ["Sì", "No"],
  },
  { id: "firma", title: "Firma", type: "text", required: true },
];

const DURATION_MS = 45 * 60 * 1000;
const STORAGE_KEY = "lspd_bando_start";
const SUBMITTED_KEY = "lspd_bando_submitted";

const startCta = document.getElementById("startCta");
const startBtn = document.getElementById("startBtn");
const bandoSection = document.getElementById("bando");
const clockEl = document.getElementById("clock");
const countdownEl = document.getElementById("countdown");
const bandoForm = document.getElementById("bandoForm");
const formClosed = document.getElementById("formClosed");
const confirmBox = document.getElementById("confirmBox");
const aiScoreBox = document.getElementById("aiScoreBox");

if (startBtn) {
  // se l'utente ha già iniziato in questa sessione (es. refresh), riprendi da dove era
  const existingStart = sessionStorage.getItem(STORAGE_KEY);
  const alreadySubmitted = sessionStorage.getItem(SUBMITTED_KEY);

  if (alreadySubmitted) {
    showBando();
    renderForm();
    showConfirmation(JSON.parse(alreadySubmitted));
  } else if (existingStart) {
    showBando();
    renderForm();
    startTimer(parseInt(existingStart, 10));
  }

  startBtn.addEventListener("click", () => {
    const now = Date.now();
    sessionStorage.setItem(STORAGE_KEY, String(now));
    showBando();
    renderForm();
    startTimer(now);
  });
}

function showBando() {
  startCta.style.display = "none";
  bandoSection.style.display = "block";
  bandoSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderForm() {
  if (bandoForm.dataset.rendered) return;
  bandoForm.dataset.rendered = "1";

  bandoForm.innerHTML =
    QUESTIONS.map(renderQuestion).join("") +
    `<div class="form-msg err" id="formMsg"></div>
     <div class="submit-wrap">
       <button type="submit" class="btn" id="submitBtn">Invia candidatura</button>
     </div>`;

  bandoForm.addEventListener("submit", onSubmit);
  wireOtherInputs();
}

function wireOtherInputs() {
  bandoForm.querySelectorAll("[data-other-input]").forEach((textInput) => {
    const qId = textInput.dataset.otherInput;
    const radios = bandoForm.querySelectorAll(`input[type="radio"][name="${qId}"]`);
    radios.forEach((r) => {
      r.addEventListener("change", () => {
        const isOther = r.value === "__other__" && r.checked;
        textInput.disabled = !isOther;
        if (isOther) textInput.focus();
      });
    });
  });
}

function renderQuestion(q) {
  const req = q.required ? '<span class="required">*</span>' : "";

  if (q.type === "section") {
    return `<h3 class="q-section-title">${q.title}</h3>`;
  }

  if (q.type === "text") {
    return `
      <div class="q-block">
        <label class="q-title" for="${q.id}">${q.title}${req}</label>
        <input type="text" id="${q.id}" name="${q.id}" ${q.required ? "required" : ""}>
      </div>`;
  }

  if (q.type === "date") {
    return `
      <div class="q-block">
        <label class="q-title" for="${q.id}">${q.title}${req}</label>
        <input type="date" id="${q.id}" name="${q.id}" ${q.required ? "required" : ""}>
      </div>`;
  }

  if (q.type === "textarea") {
    return `
      <div class="q-block">
        <label class="q-title" for="${q.id}">${q.title}${req}</label>
        <textarea id="${q.id}" name="${q.id}" ${q.required ? "required" : ""}></textarea>
      </div>`;
  }

  if (q.type === "radio") {
    const opts = q.options
      .map(
        (opt, i) => `
        <label>
          <input type="radio" name="${q.id}" value="${escapeAttr(opt)}" ${
          q.required && i === 0 ? "required" : ""
        }>
          ${opt}
        </label>`
      )
      .join("");
    return `
      <div class="q-block">
        <label class="q-title">${q.title}${req}</label>
        <div class="q-options">${opts}</div>
      </div>`;
  }

  if (q.type === "radio_other") {
    const opts = q.options
      .map(
        (opt, i) => `
        <label>
          <input type="radio" name="${q.id}" value="${escapeAttr(opt)}" ${
          q.required && i === 0 ? "required" : ""
        }>
          ${opt}
        </label>`
      )
      .join("");
    return `
      <div class="q-block">
        <label class="q-title">${q.title}${req}</label>
        <div class="q-options">
          ${opts}
          <div class="q-other-wrap">
            <label style="gap:10px;">
              <input type="radio" name="${q.id}" value="__other__" data-other-toggle="${q.id}">
              Altro:
            </label>
            <input type="text" data-other-input="${q.id}" disabled placeholder="specifica">
          </div>
        </div>
      </div>`;
  }

  return "";
}

function escapeAttr(str) {
  return String(str).replace(/"/g, "&quot;");
}

// ---------------- countdown ----------------
let timerId = null;

function startTimer(startTime) {
  function closeForm() {
    Array.from(bandoForm.elements).forEach((el) => (el.disabled = true));
    formClosed.classList.add("active");
    clockEl.textContent = "00:00";
    countdownEl.classList.add("warn");
  }

  function tick() {
    const remaining = DURATION_MS - (Date.now() - startTime);
    if (remaining <= 0) {
      closeForm();
      clearInterval(timerId);
      return;
    }
    const totalSeconds = Math.floor(remaining / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    clockEl.textContent = String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
    if (minutes < 5) countdownEl.classList.add("warn");
  }

  tick();
  timerId = setInterval(tick, 1000);
}

// ---------------- submit ----------------
async function onSubmit(e) {
  e.preventDefault();
  const msgEl = document.getElementById("formMsg");
  const submitBtn = document.getElementById("submitBtn");
  msgEl.textContent = "";

  const formData = new FormData(bandoForm);
  const inputFields = QUESTIONS.filter((q) => q.type !== "section");

  const fields = inputFields.map((q) => {
    if (q.type === "radio_other") {
      const val = formData.get(q.id) || "";
      if (val === "__other__") {
        const otherText = bandoForm.querySelector(`[data-other-input="${q.id}"]`)?.value || "";
        return { q: q.title, a: otherText ? `Altro: ${otherText}` : "" };
      }
      return { q: q.title, a: val };
    }
    return { q: q.title, a: formData.get(q.id) || "" };
  });

  const missing = inputFields.some((q) => {
    if (!q.required) return false;
    if (q.type === "radio_other") {
      const val = formData.get(q.id);
      if (!val) return true;
      if (val === "__other__") {
        const otherText = bandoForm.querySelector(`[data-other-input="${q.id}"]`)?.value || "";
        return !otherText.trim();
      }
      return false;
    }
    return !formData.get(q.id);
  });
  if (missing) {
    msgEl.textContent = "Compila tutti i campi obbligatori prima di inviare.";
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Invio in corso…";

  try {
    const res = await fetch("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });
    const data = await res.json();

    if (!res.ok || !data.ok) throw new Error(data.error || "submit_failed");

    if (timerId) clearInterval(timerId);
    sessionStorage.setItem(SUBMITTED_KEY, JSON.stringify(data));
    showConfirmation(data);
  } catch (err) {
    msgEl.textContent = "Invio non riuscito. Controlla la connessione e riprova.";
    submitBtn.disabled = false;
    submitBtn.textContent = "Invia candidatura";
  }
}

function showConfirmation(data) {
  bandoForm.style.display = "none";
  formClosed.classList.remove("active");
  confirmBox.style.display = "block";

  if (typeof data.aiScore === "number") {
    aiScoreBox.style.display = "inline-flex";
    aiScoreBox.innerHTML = `🤖 Stima testo generato da AI: <strong>${data.aiScore}%</strong> — indicativa, non è una prova.`;
  }
}
