# LSPD — Sito Bando + Department Command (Netlify)

## ⚠️ AZIONE URGENTE prima di pubblicare

In una versione precedente del sito, l'URL del webhook Discord era scritto
in chiaro dentro il codice. Se l'hai già caricato su un repository
GitHub (anche privato, anche solo per un attimo) o l'hai condiviso
altrove, **quel webhook va considerato compromesso**: chiunque lo trovi
può mandare messaggi nel tuo canale Discord fingendosi il bot.

**Vai su Discord → canale → ⚙️ Integrazioni → Webhook → elimina quel
webhook e creane uno nuovo.** Usa il nuovo URL solo nella variabile
d'ambiente `DISCORD_WEBHOOK_URL` su Netlify (istruzioni sotto) — mai nel
codice.

## File

- `index.html` — home: hero, banner, requisiti, bottone "Inizia Bando LSPD" (link a `/bando`)
- `bando.html` + `bando.js` — modulo di candidatura: il countdown di 45 minuti parte da solo appena questa pagina si apre
- `command.html` + `command.js` — login "Department Command" + bacheca candidature (letta tramite `/api/applications`, protetta da token)
- `style.css` — grafica condivisa, ottimizzata per iPhone/iPad/tablet
- `netlify/functions/login.js` — verifica username+password lato server e rilascia un token di sessione firmato
- `netlify/functions/submit.js` — riceve le risposte al bando, calcola la stima AI, manda su Discord, salva su Firebase
- `netlify/functions/applications.js` — restituisce le candidature SOLO a chi presenta un token valido
- `netlify.toml` — dice a Netlify dove sono le funzioni e reindirizza `/api/*` alle funzioni vere, più gli URL puliti `/bando` e `/command`

Ogni funzione in `netlify/functions/` è **autosufficiente** (nessuna
dipendenza da altri file lì dentro): un upload parziale o disordinato su
GitHub non può romperle a vicenda.

## ⚠️ Prima di pubblicare: metti le domande vere

Le domande sono in cima a `bando.js`, nell'array `QUESTIONS`. Sostituiscile
se necessario con quelle esatte del tuo modulo.

## 1. Le 7 variabili d'ambiente su Netlify

Vai su: sito → **Site configuration → Environment variables → Add a
variable**. Nessun segreto resta scritto nel codice.

| Variabile | A cosa serve | Dove trovarla |
|---|---|---|
| `ADMIN_USERNAME` | username per accedere a `/command` | scegli tu, es. `Pavel` |
| `ADMIN_PASSWORD` | password per accedere a `/command` | scegli tu una password. Non serve calcolare nessun hash a mano: la confronta direttamente la funzione server |
| `SESSION_SECRET` | firma i token di sessione del Command | una stringa lunga e casuale a scelta tua, es. generata con `openssl rand -hex 32` in un terminale, o anche solo una password lunga a caso |
| `FIREBASE_URL` | indirizzo del Realtime Database (usato solo per salvare/leggere le candidature ricevute, non per il login) | Firebase Console → Realtime Database, in alto. Es: `https://ciao111-default-rtdb.europe-west1.firebasedatabase.app` |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | credenziali admin che leggono/scrivono il database bypassando le regole | Firebase Console → ⚙️ Impostazioni progetto → **Account di servizio** → **Genera nuova chiave privata** → si scarica un `.json`: apri il file, copia **tutto** il contenuto (da `{` a `}`) e incollalo come Value |
| `DISCORD_WEBHOOK_URL` | manda l'embed su Discord ad ogni candidatura | canale Discord → ⚙️ Integrazioni → Webhook → copia URL (quello **nuovo**, non quello vecchio compromesso) |
| `DISCORD_ROLE_ID` | ruolo da taggare (@) quando arriva una candidatura | tasto destro sul ruolo → "Copia ID" (serve modalità sviluppatore attiva in Discord → Impostazioni → Avanzate) |

Se salti `ADMIN_USERNAME` / `ADMIN_PASSWORD`, il login su `/command` non
funziona mai. Se salti `SESSION_SECRET`, il login fallisce sempre con
"sessione non configurata". Se salti `DISCORD_WEBHOOK_URL`, il sito
continua a funzionare ma non manda nulla su Discord. Se salti `FIREBASE_URL`
/ `FIREBASE_SERVICE_ACCOUNT_KEY`, il login funziona comunque (non dipende
più da Firebase) ma le candidature non vengono salvate né mostrate nella
bacheca.

## 2. Rifai il deploy dopo aver impostato le variabili

Le variabili non si applicano da sole al sito già online. Vai su
**Deploys → Trigger deploy → Deploy site**.

## 3. Login del Command

Non serve creare nessun utente da nessuna parte: username e password sono
esattamente quelli che hai messo in `ADMIN_USERNAME` e `ADMIN_PASSWORD` al
punto 1. Vai su `/command` e usa quelli.


## 4. Regole Firebase (Realtime Database → Regole)

Firebase serve solo a salvare/leggere le candidature (non più per il
login). Resta comunque chiuso alla lettura/scrittura pubblica: solo la
funzione serverless (con le credenziali admin) può leggere e scrivere.

```json
{
  "rules": {
    "applications": { ".read": false, ".write": false }
  }
}
```

Se avevi già creato un nodo `users` da un tentativo precedente, puoi
cancellarlo pure (non serve più a nulla): dalla Firebase Console, passa il
mouse su "users" nell'albero e clicca la ✕.

## 5. Pubblica su Netlify

**Opzione A — dalla dashboard (più semplice):** Netlify → **Add new site
→ Import an existing project** → collega il repo GitHub. Netlify legge da
solo `netlify.toml`: build command vuoto, publish directory `.`. Deploy.

**Opzione B — da terminale:**
```bash
npm install -g netlify-cli   # solo la prima volta
cd lspd-site
netlify deploy --prod
```

**Quando carichi i file su GitHub, selezionali tutti insieme in un solo
upload** (compresa la cartella `netlify/functions/` e il file
`package.json`) — se li carichi in più tentativi separati GitHub rinomina
i doppioni in `file (1).ext` e il progetto non funziona più.

## 6. Testa

Vai su `/command`, fai login con l'utente che hai creato. Se dà ancora
errore (es. 404 su `/api/login`), controlla su Netlify:
- **Deploys** → l'ultimo deploy è andato a buon fine (non "Failed")?
- **Functions** → vedi elencate `login`, `submit`, `applications`? Se non
  compaiono, la cartella `netlify/functions/` non è arrivata nel deploy —
  ricarica il repo controllando che quella cartella ci sia per intero.
- Clic su una funzione → **Function log** per l'errore esatto, se serve
  mandami uno screenshot.

## Ottimizzazione iPhone / iPad / tablet

- Menu di navigazione: sotto i 760px diventa un pannello a scomparsa (☰)
- Campi di testo: font-size 16px sotto i 600px, per impedire lo zoom automatico di Safari su iPhone
- `viewport-fit=cover` + safe-area: contenuto non finisce sotto la Dynamic Island/il notch
- Icona home schermata (apple-touch-icon) impostata sul logo del sito
- Griglie a colonna singola su telefono, due colonne su iPad/tablet

## Logo

Il logo del sito (header + icona) usa questo indirizzo:
`https://cdn.phototourl.com/free/2026-08-30-c218c141-154a-4354-983e-1d187be89cde.webp`

Se in futuro quel link scade, salva l'immagine dentro il repo (es.
`img/logo.webp`) e cambia i riferimenti nei tre file HTML.

## Sul rilevatore AI — leggi questo prima di usarlo

La percentuale che vedi in fondo a ogni candidatura è un'euristica su
lunghezza delle frasi, varietà del vocabolario e frasi fatte tipiche dei
testi generati — **non è un rilevatore affidabile**. Nessun AI-detector lo
è davvero, nemmeno quelli commerciali: danno falsi positivi anche su testo
scritto da persone normali. Usalo come spunto per rileggere con più
attenzione una risposta, mai come prova per scartare o accusare un
candidato.

## Note

- Il countdown dei 45 minuti parte all'apertura di `bando.html`, salvato in
  `sessionStorage`: un refresh non lo azzera, ma chiudere la scheda e
  riaprirla in una sessione nuova sì (limitazione di un sito senza account
  per i candidati).
- La sessione del Command dura 12 ore dal login, poi va rifatto il login.
