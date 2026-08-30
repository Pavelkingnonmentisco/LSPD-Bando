// api/_session.js — token di sessione firmati per il Department Command.
//
// Dopo il login, il server rilascia un token "username.scadenza.firma".
// La firma è un HMAC-SHA256 calcolato con SESSION_SECRET (una variabile
// d'ambiente segreta che imposti tu su Vercel — vedi README). Senza
// conoscere SESSION_SECRET non si può fabbricare un token valido, quindi
// /api/applications può fidarsi del token invece di lasciare i dati
// leggibili da chiunque conosca l'URL.
//
// Il token dura 12 ore, poi va rifatto il login.

const crypto = require("crypto");

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

function sign(username) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;

  const expires = Date.now() + TOKEN_TTL_MS;
  const payload = `${username}.${expires}`;
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

function verify(token) {
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

module.exports = { sign, verify };
