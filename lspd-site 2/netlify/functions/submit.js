// netlify/functions/submit.js — riceve le risposte al bando dal sito,
// calcola una stima euristica "testo scritto da AI", manda l'embed su
// Discord (con ping al ruolo) e salva la candidatura su Firebase (via
// firebase-admin, così il database può restare completamente chiuso al
// pubblico).
//
// TUTTI i segreti (webhook Discord, ruolo, Firebase) vengono letti SOLO da
// variabile d'ambiente su Netlify. Nessun valore è scritto qui nel codice,
// per non finire in un repo pubblico su GitHub.
//
// File autosufficiente: nessuna dipendenza da altri file dentro netlify/functions.

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

  const { fields } = body;
  if (!Array.isArray(fields) || fields.length === 0) {
    return json(400, { ok: false, error: "missing_fields" });
  }

  try {
    const aiScore = estimateAiScore(fields);
    const timestamp = Date.now();
    const title = "Nuova candidatura — Bando LSPD";

    await Promise.all([
      postToDiscord(title, fields, aiScore, timestamp),
      saveToFirebase(title, fields, aiScore, timestamp),
    ]);

    return json(200, { ok: true, aiScore });
  } catch (err) {
    return json(500, { ok: false, error: "server_error" });
  }
};

// ------------------------------------------------------------------
// Stima euristica "testo scritto da AI".
// NON è un rilevatore affidabile: nessun AI-detector lo è davvero, nemmeno
// quelli commerciali. Guarda solo alcuni segnali superficiali (uniformità
// delle frasi, varietà del vocabolario, frasi fatte tipiche dei testi
// generati) e restituisce un numero indicativo 0-100, utile al massimo come
// spunto per una rilettura più attenta — mai come prova.
// ------------------------------------------------------------------
const AI_CLICHE_PHRASES = [
  "in conclusione",
  "è importante sottolineare",
  "in un mondo sempre più",
  "nel panorama attuale",
  "senza dubbio",
  "non è solo",
  "gioca un ruolo cruciale",
  "in definitiva",
  "innanzitutto",
  "risulta evidente",
];

function estimateAiScore(fields) {
  const longAnswers = fields
    .map((f) => f.a || "")
    .filter((a) => a.split(/\s+/).length >= 15);

  if (longAnswers.length === 0) return 0;

  const text = longAnswers.join(" ");
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const words = text
    .toLowerCase()
    .replace(/[.,!?;:()"']/g, "")
    .split(/\s+/)
    .filter(Boolean);

  if (words.length < 10) return 0;

  const lengths = sentences.map((s) => s.split(/\s+/).length);
  const avgLen = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance =
    lengths.reduce((sum, l) => sum + Math.pow(l - avgLen, 2), 0) / lengths.length;
  const uniformityScore = sentences.length >= 3 && variance < 6 ? 15 : variance < 15 ? 6 : 0;

  const uniqueWords = new Set(words);
  const diversity = uniqueWords.size / words.length;
  const diversityScore = words.length >= 25 && diversity > 0.8 ? 12 : 0;

  const lowerText = text.toLowerCase();
  const clicheHits = AI_CLICHE_PHRASES.filter((p) => lowerText.includes(p)).length;
  const clicheScore = Math.min(clicheHits * 18, 45);

  const lengthScore = avgLen > 22 && avgLen < 30 && variance < 10 ? 10 : 0;

  const total = Math.min(
    uniformityScore + diversityScore + clicheScore + lengthScore,
    100
  );

  return Math.round(total);
}

// ------------------------------------------------------------------

async function postToDiscord(title, fields, aiScore, timestamp) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return; // non configurato su Netlify: salta silenziosamente

  const roleId = process.env.DISCORD_ROLE_ID || "";

  const embed = {
    title,
    color: 0xc9a227,
    timestamp: new Date(timestamp).toISOString(),
    fields: fields.slice(0, 24).map((f) => ({
      name: truncate(f.q, 256),
      value: truncate(f.a || "—", 1024),
      inline: false,
    })),
    footer: {
      text: `🤖 Stima testo generato da AI: ${aiScore}% (indicativa, non è una prova)`,
    },
  };

  const payload = {
    content: roleId ? `<@&${roleId}>` : undefined,
    allowed_mentions: roleId ? { roles: [roleId] } : undefined,
    embeds: [embed],
  };

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function saveToFirebase(title, fields, aiScore, timestamp) {
  const app = getAdminApp();
  if (!app) return; // Firebase non configurato su Netlify: la candidatura non viene salvata

  const payload = { title, fields, aiScore, timestamp };
  await app.database().ref("applications").push(payload);
}

function truncate(str, max) {
  str = String(str || "");
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}
