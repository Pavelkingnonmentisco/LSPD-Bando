// /api/login — verifica username + hash password lato SERVER.
//
// Prima il login leggeva /users/{username}.json direttamente dal browser:
// funziona solo se le regole Firebase lasciano leggibile "users", ma
// lasciarlo leggibile significa che chiunque può scaricare tutti gli hash
// delle password. Con le regole chiuse (".read": false su "users", vedi
// README) il browser prende 401 — è la causa esatta dell'errore che vedevi.
//
// Ora la verifica avviene qui, sul server, che può leggere "users" anche a
// regole chiuse usando FIREBASE_DB_SECRET (Firebase Console → impostazioni
// progetto → Service accounts → scheda "Database secrets" legacy, oppure —
// se il progetto non la mostra più — vedi la nota nel README per
// l'alternativa). Il browser non riceve mai l'hash salvato, solo true/false.

const FIREBASE_URL =
  process.env.FIREBASE_URL ||
  "https://ciao111-default-rtdb.europe-west1.firebasedatabase.app";
const FIREBASE_DB_SECRET = process.env.FIREBASE_DB_SECRET || "";

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

    const authParam = FIREBASE_DB_SECRET
      ? `?auth=${encodeURIComponent(FIREBASE_DB_SECRET)}`
      : "";
    const url = `${FIREBASE_URL}/users/${encodeURIComponent(username)}.json${authParam}`;

    const r = await fetch(url);
    if (!r.ok) {
      // 401 qui = le regole sono chiuse E manca/è sbagliato FIREBASE_DB_SECRET.
      res.status(200).json({ ok: false, error: "credenziali_non_verificabili" });
      return;
    }

    const user = await r.json();
    const valid = !!(user && user.passwordHash && user.passwordHash === passwordHash);

    res.status(200).json({ ok: valid });
  } catch (err) {
    res.status(500).json({ ok: false, error: "server_error" });
  }
};
