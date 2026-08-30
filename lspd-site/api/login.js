// /api/login — verifica username + hash password lato SERVER usando
// firebase-admin, poi rilascia un token di sessione firmato (vedi
// api/_session.js) usato da /api/applications per proteggere i dati.
//
// Il browser non riceve mai l'hash salvato, solo true/false + il token.
//
// Variabili d'ambiente richieste (vedi README): FIREBASE_URL,
// FIREBASE_SERVICE_ACCOUNT_KEY, SESSION_SECRET.

const { getAdminApp } = require("./_firebase");
const { sign } = require("./_session");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "method_not_allowed" });
    return;
  }

  try {
    const { username, passwordHash } = req.body || {};
    if (!username || !passwordHash) {
      res.status(400).json({ ok: false, error: "missing_fields" });
      return;
    }

    const app = getAdminApp();
    if (!app) {
      // Mancano o sono malformate le variabili Firebase su Vercel.
      res.status(200).json({ ok: false, error: "credenziali_non_verificabili" });
      return;
    }

    const snap = await app.database().ref(`users/${username}`).once("value");
    const user = snap.val();
    const valid = !!(user && user.passwordHash && user.passwordHash === passwordHash);

    if (!valid) {
      res.status(200).json({ ok: false });
      return;
    }

    const token = sign(username);
    if (!token) {
      // Manca SESSION_SECRET su Vercel.
      res.status(200).json({ ok: false, error: "sessione_non_configurata" });
      return;
    }

    res.status(200).json({ ok: true, token });
  } catch (err) {
    res.status(500).json({ ok: false, error: "server_error" });
  }
};
