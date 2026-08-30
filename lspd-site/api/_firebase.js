// api/_firebase.js — inizializzazione condivisa di firebase-admin.
//
// Richiede DUE variabili d'ambiente su Vercel (nessun valore è scritto
// qui nel codice, per non finire in un repo pubblico su GitHub):
//   FIREBASE_URL                  -> URL del Realtime Database
//   FIREBASE_SERVICE_ACCOUNT_KEY  -> contenuto del file JSON del service
//                                     account (Firebase Console →
//                                     Impostazioni progetto → Account di
//                                     servizio → Genera nuova chiave privata)

const admin = require("firebase-admin");

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

module.exports = { getAdminApp };
