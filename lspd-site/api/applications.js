// /api/applications — restituisce le candidature ricevute, SOLO a chi
// presenta un token di sessione valido (rilasciato da /api/login).
//
// Prima le candidature venivano lette dal browser direttamente da Firebase
// con regola ".read": true, quindi chiunque conoscesse l'URL del database
// poteva leggere tutti i dati dei candidati (nomi, ID Discord, età,
// risposte) senza fare login. Ora la lettura avviene solo qui, lato
// server, con le credenziali admin — e Firebase può restare completamente
// chiuso al pubblico (vedi regole nel README).

const { getAdminApp } = require("./_firebase");
const { verify } = require("./_session");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ ok: false, error: "method_not_allowed" });
    return;
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const session = verify(token);

  if (!session) {
    res.status(401).json({ ok: false, error: "not_authenticated" });
    return;
  }

  try {
    const app = getAdminApp();
    if (!app) {
      res.status(200).json({ ok: false, error: "server_non_configurato" });
      return;
    }

    const snap = await app.database().ref("applications").once("value");
    const data = snap.val();

    const entries = data
      ? Object.values(data).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      : [];

    res.status(200).json({ ok: true, entries });
  } catch (err) {
    res.status(500).json({ ok: false, error: "server_error" });
  }
};
