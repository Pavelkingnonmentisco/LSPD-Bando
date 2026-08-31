// ---------------------------------------------------------------
// Department Command — login + bacheca candidature
//
// Lo username e la password del Command sono le variabili d'ambiente
// ADMIN_USERNAME e ADMIN_PASSWORD su Netlify (vedi README): niente
// Firebase coinvolto nel login.
//
// Le candidature vengono lette da /api/applications: il server richiede
// un token di sessione valido, rilasciato al login, così nessuno può
// leggere i dati dei candidati senza autenticarsi. Vedi README.md.
// ---------------------------------------------------------------

const SESSION_KEY = "lspd_command_session";     // username mostrato in UI
const TOKEN_KEY = "lspd_command_token";         // token firmato dal server

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

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

// ---- sessione (solo lato client, valida finché resta il tab aperto) ----
const existingUser = sessionStorage.getItem(SESSION_KEY);
const existingToken = sessionStorage.getItem(TOKEN_KEY);
if (existingUser && existingToken) showDashboard(existingUser);

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  errMsg.textContent = "";
  loginBtn.disabled = true;
  loginBtn.textContent = "Verifica in corso…";

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();

    if (data.ok && data.token) {
      sessionStorage.setItem(SESSION_KEY, username);
      sessionStorage.setItem(TOKEN_KEY, data.token);
      showDashboard(username);
    } else if (data.error === "sessione_non_configurata") {
      errMsg.textContent = "Il server non ha SESSION_SECRET configurato su Netlify (vedi README).";
    } else if (data.error === "credenziali_non_configurate") {
      errMsg.textContent = "Manca ADMIN_USERNAME o ADMIN_PASSWORD su Netlify (vedi README).";
    } else if (!res.ok) {
      errMsg.textContent = `Errore server (${res.status}). Controlla i log della funzione "login" su Netlify.`;
    } else {
      errMsg.textContent = "Credenziali non valide (username o password sbagliati).";
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
  clearSession();
  showLogin();
});

// ---- bacheca candidature (letta via /api/applications, protetta da token) ----
async function loadApplications() {
  appsList.innerHTML = '<div class="empty-state">Caricamento candidature…</div>';
  const token = sessionStorage.getItem(TOKEN_KEY);

  try {
    const res = await fetch("/api/applications", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
      clearSession();
      showLogin();
      errMsg.textContent = "Sessione scaduta, accedi di nuovo.";
      return;
    }

    const data = await res.json();
    if (!data.ok) {
      appsList.innerHTML = '<div class="empty-state">Errore nel caricamento delle candidature.</div>';
      return;
    }

    if (!data.entries.length) {
      appsList.innerHTML = '<div class="empty-state">Nessuna candidatura ricevuta finora.</div>';
      return;
    }

    appsList.innerHTML = data.entries.map(renderEmbedCard).join("");
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
