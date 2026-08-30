// /api/submit — riceve le risposte al bando dal sito, calcola una stima
// euristica "testo scritto da AI", manda l'embed su Discord (con ping al
// ruolo) e salva la candidatura su Firebase per la pagina Department Command.
//
// Il webhook Discord viene letto da variabile d'ambiente se configurata su
// Vercel (Project → Settings → Environment Variables), altrimenti usa il
// valore di default qui sotto. Per sicurezza, appena puoi, spostalo in una
// env var chiamata DISCORD_WEBHOOK_URL e cancella il valore hardcoded.

const DISCORD_WEBHOOK_URL =
  process.env.DISCORD_WEBHOOK_URL ||
  "https://discord.com/api/webhooks/1543725920668487752/0Lya120wCttcSKMhgK72Ax6U1FhaeIAoDBWIZPlZu6HLUlVak6hPLvCnUfeRoyQzO4hD";

const DISCORD_ROLE_ID = process.env.DISCORD_ROLE_ID || "1528025040098955362";

const FIREBASE_URL =
  process.env.FIREBASE_URL ||
  "https://ciao111-default-rtdb.europe-west1.firebasedatabase.app";

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "method_not_allowed" });
    return;
  }

  try {
    const { fields } = req.body || {};
    if (!Array.isArray(fields) || fields.length === 0) {
      res.status(400).json({ ok: false, error: "missing_fields" });
      return;
    }

    const aiScore = estimateAiScore(fields);
    const timestamp = Date.now();
    const title = "Nuova candidatura — Bando LSPD";

    await Promise.all([
      postToDiscord(title, fields, aiScore, timestamp),
      saveToFirebase(title, fields, aiScore, timestamp),
    ]);

    res.status(200).json({ ok: true, aiScore });
  } catch (err) {
    res.status(500).json({ ok: false, error: "server_error" });
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

  // 1) uniformità della lunghezza delle frasi (AI tende a frasi molto regolari)
  const lengths = sentences.map((s) => s.split(/\s+/).length);
  const avgLen = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance =
    lengths.reduce((sum, l) => sum + Math.pow(l - avgLen, 2), 0) / lengths.length;
  const uniformityScore = sentences.length >= 3 && variance < 6 ? 15 : variance < 15 ? 6 : 0;

  // 2) diversità lessicale (testo umano spontaneo è spesso più ripetitivo/vario in modo irregolare)
  const uniqueWords = new Set(words);
  const diversity = uniqueWords.size / words.length;
  const diversityScore = words.length >= 25 && diversity > 0.8 ? 12 : 0;

  // 3) frasi fatte tipiche dei testi generati da AI — segnale più affidabile degli altri due
  const lowerText = text.toLowerCase();
  const clicheHits = AI_CLICHE_PHRASES.filter((p) => lowerText.includes(p)).length;
  const clicheScore = Math.min(clicheHits * 18, 45);

  // 4) frasi lunghe e costanti insieme (non da sole) = testo "compitino"
  const lengthScore = avgLen > 22 && avgLen < 30 && variance < 10 ? 10 : 0;

  const total = Math.min(
    uniformityScore + diversityScore + clicheScore + lengthScore,
    100
  );

  return Math.round(total);
}

// ------------------------------------------------------------------

async function postToDiscord(title, fields, aiScore, timestamp) {
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
    content: `<@&${DISCORD_ROLE_ID}>`,
    allowed_mentions: { roles: [DISCORD_ROLE_ID] },
    embeds: [embed],
  };

  await fetch(DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function saveToFirebase(title, fields, aiScore, timestamp) {
  const payload = { title, fields, aiScore, timestamp };

  await fetch(`${FIREBASE_URL}/applications.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

function truncate(str, max) {
  str = String(str || "");
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}
