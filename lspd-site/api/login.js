// /api/login — verifica username + hash password lato SERVER usando
// firebase-admin. L'SDK admin legge il Realtime Database bypassando le
// regole di sicurezza (quindi funziona anche con "users": { ".read": false }),
// usando le credenziali del service account — non il vecchio "database
// secret" legacy che molti progetti nuovi non mostrano più in console.
//
// Il browser non riceve mai l'hash salvato, solo true/false.
//
// Richiede due variabili d'ambiente su Vercel (vedi README):
//   FIREBASE_SERVICE_ACCOUNT_KEY -> il contenuto del file JSON scaricato da
//                                   Firebase Console (Impostazioni progetto
//                                   → Account di servizio → Genera nuova
//                                   chiave privata), incollato per intero
//                                   come UNA SINGOLA riga di testo.
//   FIREBASE_URL                 -> l'URL del Realtime Database (già
//                                   presente come fallback qui sotto).

const admin = require("firebase-admin");

const FIREBASE_URL =
  process.env.FIREBASE_URL ||
  "https://ciao111-default-rtdb.europe-west1.firebasedatabase.app";

function getAdminApp() {
  if (admin.apps.length) return admin.app();

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) return null;

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(raw);
  } catch (e) {
    return null;
  }

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: FIREBASE_URL,
  });
}

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
      // Manca o è malformata FIREBASE_SERVICE_ACCOUNT_KEY su Vercel.
      res.status(200).json({ ok: false, error: "credenziali_non_verificabili" });
      return;
    }

    const snap = await app.database().ref(`users/${username}`).once("value");
    const user = snap.val();

    const valid = !!(user && user.passwordHash && user.passwordHash === passwordHash);
    res.status(200).json({ ok: valid });
  } catch (err) {
    res.status(500).json({ ok: false, error: "server_error" });
  }
};
