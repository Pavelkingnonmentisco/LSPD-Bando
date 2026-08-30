// ---------------------------------------------------------------
// Department Command — login + bacheca candidature
//
// Le password NON sono salvate in chiaro nel database: viene calcolato
// l'hash SHA-256 della password inserita e la verifica avviene lato
// server su /api/login (così /users può restare protetto da regole
// Firebase chiuse senza rompere il login — vedi api/login.js).
// Vedi README.md per come creare il primo utente (Pavel).
// ---------------------------------------------------------------

const FIREBASE_URL = "https://ciao111-default-rtdb.europe-west1.firebasedatabase.app";
const SESSION_KEY = "lspd_command_session";

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const loginScreen = document.getElementById("loginScreen");
const dashboardScreen = document.getElementById("dashboardScreen");
const loginForm = document.getElementById("loginForm");
const errMsg = document.getElementById("errMsg");
const loginBtn = document.getElementById("loginBtn");
const whoUser = document.getElementById("whoUser");
const logoutBtn = document.getElementById("logoutBtn");
const appsList = document.getElementById("appsList");

function showDashboard(username) {
  loginScreen.style.display = "none";
  dashboardScreen.style.display = "flex";
  whoUser.textContent = username;
  loadApplications();
}

function showLogin() {
  dashboardScreen.style.display = "none";
  loginScreen.style.display = "flex";
}

// ---- sessione (solo lato client, valida finché resta il tab aperto) ----
const existing = sessionStorage.getItem(SESSION_KEY);
if (existing) showDashboard(existing);

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  errMsg.textContent = "";
  loginBtn.disabled = true;
  loginBtn.textContent = "Verifica in corso…";

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  try {
    const passwordHash = await sha256(password);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, passwordHash }),
    });
    const data = await res.json();

    if (data.ok) {
      sessionStorage.setItem(SESSION_KEY, username);
      showDashboard(username);
    } else {
      errMsg.textContent = "Credenziali non valide.";
    }
  } catch (err) {
    errMsg.textContent = "Impossibile contattare il server. Riprova.";
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Accedi";
  }
});

logoutBtn.addEventListener("click", (e) => {
  e.preventDefault();
  sessionStorage.removeItem(SESSION_KEY);
  showLogin();
});

// ---- bacheca candidature (popolata dall'Apps Script ad ogni risposta al bando) ----
async function loadApplications() {
  appsList.innerHTML = '<div class="empty-state">Caricamento candidature…</div>';
  try {
    const res = await fetch(`${FIREBASE_URL}/applications.json`);
    const data = await res.json();

    if (!data) {
      appsList.innerHTML = '<div class="empty-state">Nessuna candidatura ricevuta finora.</div>';
      return;
    }

    const entries = Object.values(data).sort(
      (a, b) => (b.timestamp || 0) - (a.timestamp || 0)
    );

    appsList.innerHTML = entries.map(renderEmbedCard).join("");
  } catch (err) {
    appsList.innerHTML = '<div class="empty-state">Errore nel caricamento delle candidature.</div>';
  }
}

function renderEmbedCard(entry) {
  const date = entry.timestamp
    ? new Date(entry.timestamp).toLocaleString("it-IT")
    : "";
  const fields = (entry.fields || [])
    .map(
      (f) => `
      <div class="e-field">
        <div class="q">${escapeHtml(f.q)}</div>
        <div class="a">${escapeHtml(f.a)}</div>
      </div>`
    )
    .join("");

  return `
    <div class="embed-card">
      <div class="e-title">${escapeHtml(entry.title || "Nuova candidatura — Bando LSPD")}</div>
      <div class="e-time">${date}</div>
      ${fields}
      ${
        typeof entry.aiScore === "number"
          ? `<div class="e-ai">🤖 Stima testo generato da AI: <strong>${entry.aiScore}%</strong> — indicativa, non è una prova.</div>`
          : ""
      }
    </div>`;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
