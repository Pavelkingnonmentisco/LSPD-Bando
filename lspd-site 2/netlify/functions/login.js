// netlify/functions/login.js — verifica username + password del Department
// Command confrontandoli con le variabili d'ambiente ADMIN_USERNAME e
// ADMIN_PASSWORD (Netlify → Site configuration → Environment variables).
// Nessun Firebase coinvolto nel login: niente hash da generare a mano,
// niente nodi da creare nel database.
//
// Rilascia poi un token di sessione firmato (HMAC con SESSION_SECRET),
// usato da applications.js per proteggere la lettura delle candidature.

const crypto = require("crypto");

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

function signToken(username) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;

  const expires = Date.now() + TOKEN_TTL_MS;
  const payload = `${username}.${expires}`;
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
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

  const { username, password } = body;
  if (!username || !password) {
    return json(400, { ok: false, error: "missing_fields" });
  }

  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminUsername || !adminPassword) {
    // Mancano le variabili su Netlify.
    return json(200, { ok: false, error: "credenziali_non_configurate" });
  }

  const valid = safeEqual(username, adminUsername) && safeEqual(password, adminPassword);
  if (!valid) return json(200, { ok: false });

  const token = signToken(username);
  if (!token) {
    // Manca SESSION_SECRET su Netlify.
    return json(200, { ok: false, error: "sessione_non_configurata" });
  }

  return json(200, { ok: true, token });
};

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}
