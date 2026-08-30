/**
 * LSPD — Bando: automazione risposta al modulo.
 *
 * COME INSTALLARLO (una volta sola):
 * 1. Apri il tuo Google Form (quello del bando) in modalità editor.
 * 2. Menu in alto a destra (⋮) → "Editor di script" (oppure Estensioni → Apps Script).
 * 3. Cancella il contenuto di default e incolla questo intero file.
 * 4. Salva il progetto (icona dischetto).
 * 5. Nel pannello a sinistra clicca l'icona "Trigger" (orologio) →
 *    "+ Aggiungi trigger" → funzione: onFormSubmit, evento: "Alla
 *    conferma del modulo" ("From form" → "On form submit"). Salva e
 *    autorizza le richieste quando richiesto.
 *
 * Da questo momento, ogni volta che qualcuno invia il bando:
 *  - viene creato un embed e mandato sul canale Discord con ping al ruolo
 *  - la stessa candidatura viene salvata su Firebase, così compare
 *    anche nella pagina Department Command del sito.
 */

const DISCORD_WEBHOOK_URL =
  "https://discord.com/api/webhooks/1543725920668487752/0Lya120wCttcSKMhgK72Ax6U1FhaeIAoDBWIZPlZu6HLUlVak6hPLvCnUfeRoyQzO4hD";

const DISCORD_ROLE_ID = "1528025040098955362";

const FIREBASE_URL =
  "https://ciao111-default-rtdb.europe-west1.firebasedatabase.app";

function onFormSubmit(e) {
  const itemResponses = e.response.getItemResponses();

  const fields = itemResponses.map((item) => ({
    q: item.getItem().getTitle(),
    a: formatAnswer(item.getResponse()),
  }));

  const timestamp = Date.now();
  const title = "Nuova candidatura — Bando LSPD";

  postToDiscord(title, fields, timestamp);
  saveToFirebase(title, fields, timestamp);
}

function formatAnswer(response) {
  if (Array.isArray(response)) return response.join(", ");
  return String(response);
}

function postToDiscord(title, fields, timestamp) {
  const embed = {
    title: title,
    color: 0xc9a227, // oro LSPD
    timestamp: new Date(timestamp).toISOString(),
    fields: fields.slice(0, 25).map((f) => ({
      name: truncate(f.q, 256),
      value: truncate(f.a || "—", 1024),
      inline: false,
    })),
  };

  const payload = {
    content: `<@&${DISCORD_ROLE_ID}>`,
    allowed_mentions: { roles: [DISCORD_ROLE_ID] },
    embeds: [embed],
  };

  UrlFetchApp.fetch(DISCORD_WEBHOOK_URL, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
}

function saveToFirebase(title, fields, timestamp) {
  const payload = { title, fields, timestamp };

  UrlFetchApp.fetch(`${FIREBASE_URL}/applications.json`, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
}

function truncate(str, max) {
  str = String(str || "");
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}
