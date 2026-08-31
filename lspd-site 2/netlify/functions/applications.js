// netlify/functions/applications.js — restituisce le candidature ricevute,
// SOLO a chi presenta un token di sessione valido (rilasciato da login.js).
//
// Prima le candidature venivano lette dal browser direttamente da Firebase
// con regola ".read": true: chiunque conoscesse l'URL del database poteva
// leggere tutti i dati dei candidati senza fare login. Ora la lettura
// avviene solo qui, lato server, con le credenziali admin — e Firebase può
// restare completamente chiuso al pubblico (vedi regole nel README).
//
// File autosufficiente: nessuna dipendenza da altri file dentro netlify/functions.

const admin = require("firebase-admin");
const crypto = require("crypto");

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

function verifyToken(token) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || !token) return null;

  const parts = String(token).split(".");
  if (parts.length !== 3) return null;
  const [username, expiresStr, sig] = parts;

  const payload = `${username}.${expiresStr}`;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");

  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  const expires = parseInt(expiresStr, 10);
  if (!expires || Date.now() > expires) return null;

  return { username };
}

exports.handler = async function (event) {
  if (event.httpMethod !== "GET") {
    return json(405, { ok: false, error: "method_not_allowed" });
  }

  const authHeader = (event.headers && (event.headers.authorization || event.headers.Authorization)) || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const session = verifyToken(token);

  if (!session) {
    return json(401, { ok: false, error: "not_authenticated" });
  }

  try {
    const app = getAdminApp();
    if (!app) {
      return json(200, { ok: false, error: "server_non_configurato" });
    }

    const snap = await app.database().ref("applications").once("value");
    const data = snap.val();

    const entries = data
      ? Object.values(data).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      : [];

    return json(200, { ok: true, entries });
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
