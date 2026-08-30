// netlify/functions/login.js — verifica username + hash password lato
// SERVER usando firebase-admin, poi rilascia un token di sessione firmato
// (HMAC con SESSION_SECRET) usato da applications.js per proteggere i dati.
//
// Il browser non riceve mai l'hash salvato, solo true/false + il token.
// File autosufficiente: nessuna dipendenza da altri file dentro netlify/functions,
// così un upload parziale non può romperlo.
//
// Variabili d'ambiente richieste (Netlify → Site configuration →
// Environment variables): FIREBASE_URL, FIREBASE_SERVICE_ACCOUNT_KEY, SESSION_SECRET.

const admin = require("firebase-admin");
const crypto = require("crypto");

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

function getAdminApp() {
  if (admin.apps.length) return admin.app();

  const url = process.env.FIREBASE_URL;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!url || !raw) return null;

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(raw);
  } catch (e) {
    return null;
  }

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: url,
  });
}

function signToken(username) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;

  const expires = Date.now() + TOKEN_TTL_MS;
  const payload = `${username}.${expires}`;
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "method_not_allowed" });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return json(400, { ok: false, error: "invalid_json" });
  }

  const { username, passwordHash } = body;
  if (!username || !passwordHash) {
    return json(400, { ok: false, error: "missing_fields" });
  }

  try {
    const app = getAdminApp();
    if (!app) {
      // Mancano o sono malformate le variabili Firebase su Netlify.
      return json(200, { ok: false, error: "credenziali_non_verificabili" });
    }

    const snap = await app.database().ref(`users/${username}`).once("value");
    const user = snap.val();
    const valid = !!(user && user.passwordHash && user.passwordHash === passwordHash);

    if (!valid) return json(200, { ok: false });

    const token = signToken(username);
    if (!token) {
      // Manca SESSION_SECRET su Netlify.
      return json(200, { ok: false, error: "sessione_non_configurata" });
    }

    return json(200, { ok: true, token });
  } catch (err) {
    return json(500, { ok: false, error: "server_error" });
  }
};

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}
