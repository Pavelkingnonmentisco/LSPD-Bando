# LSPD — Sito Bando + Department Command

## ⚠️ AZIONE URGENTE prima di pubblicare

Nella versione precedente del sito, l'URL del webhook Discord era scritto
in chiaro dentro `api/submit.js`. Se hai già caricato quel file su un
repository GitHub (anche privato, anche solo per un attimo) o l'hai
condiviso altrove, **quel webhook è compromesso**: chiunque lo trovi può
mandare messaggi nel tuo canale Discord fingendosi il bot.

**Vai su Discord → canale → ⚙️ Integrazioni → Webhook → elimina quel
webhook e creane uno nuovo.** Poi usa il nuovo URL solo nella variabile
d'ambiente `DISCORD_WEBHOOK_URL` su Vercel (istruzioni sotto) — mai nel
codice.

## File
- `index.html` — home: hero, banner, requisiti, bottone "Inizia Bando LSPD" (link a `/bando`)
- `bando.html` + `bando.js` — pagina separata col modulo di candidatura vero e proprio: il countdown di 45 minuti parte da solo appena questa pagina si apre
- `command.html` + `command.js` — login "Department Command" + bacheca candidature (letta tramite `/api/applications`, protetta da token)
- `style.css` — grafica condivisa, ottimizzata per iPhone/iPad/tablet (menu a tendina sotto i 760px, campi che non fanno zoomare Safari, safe-area per notch/Dynamic Island)
- `api/submit.js` — funzione serverless Vercel: riceve le risposte, calcola la stima AI, manda l'embed su Discord e salva su Firebase (via firebase-admin)
- `api/login.js` — verifica username+password lato server e rilascia un token di sessione firmato
- `api/applications.js` — restituisce le candidature SOLO a chi presenta un token valido
- `api/_firebase.js`, `api/_session.js` — helper condivisi (inizializzazione Firebase admin, firma/verifica token)
- `vercel.json` — config per URL puliti (`/command`, `/bando` invece di `.html`)

## ⚠️ Prima di pubblicare: metti le domande vere

Le domande sono in cima a `bando.js`, nell'array `QUESTIONS`. Sostituiscile
con quelle esatte del tuo modulo, se necessario. Ogni domanda è un oggetto
con `id`, `title`, `type` (`text` / `textarea` / `radio` / `radio_other` /
`date` / `section`) e, per i radio, `options`.

## 1. Le 5 variabili d'ambiente su Vercel

Vai su: progetto → Settings → Environment Variables. Nessun segreto resta
scritto nel codice: se manca una di queste variabili, la funzione
corrispondente risponde con un errore gestito invece di rompersi.

| Variabile | A cosa serve | Dove trovarla |
|---|---|---|
| `FIREBASE_URL` | indirizzo del Realtime Database | Firebase Console → Realtime Database, in alto. Es: `https://ciao111-default-rtdb.europe-west1.firebasedatabase.app` |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | credenziali admin che leggono/scrivono il database bypassando le regole | Firebase Console → ⚙️ Impostazioni progetto → scheda **Account di servizio** → **Genera nuova chiave privata** → si scarica un `.json`: apri il file, copia **tutto** il contenuto (da `{` a `}`) e incollalo come Value |
| `SESSION_SECRET` | firma i token di sessione del Command (nuovo — prima non c'era) | una stringa lunga e casuale a scelta tua, es. generata con `openssl rand -hex 32` in un terminale, oppure una password lunga a caso. Non deve avere un significato, deve solo essere segreta e diversa da tutte le altre |
| `DISCORD_WEBHOOK_URL` | manda l'embed su Discord ad ogni candidatura | canale Discord → ⚙️ Integrazioni → Webhook → copia URL (quello **nuovo**, non quello vecchio compromesso) |
| `DISCORD_ROLE_ID` | ruolo da taggare (@) quando arriva una candidatura | tasto destro sul ruolo → "Copia ID" (serve modalità sviluppatore attiva in Discord → Impostazioni → Avanzate) |

Per ognuna, quando la crei: lascia le spunte su Production, Preview,
Development tutte attive, poi Save.

Se salti `DISCORD_WEBHOOK_URL`, il sito continua a funzionare ma non manda
nulla su Discord. Se salti `FIREBASE_URL` / `FIREBASE_SERVICE_ACCOUNT_KEY`,
login e salvataggio candidature non funzionano. Se salti `SESSION_SECRET`,
il login fallisce sempre con "sessione non configurata".

## 2. Rifai il deploy dopo aver impostato le variabili

Le variabili non si applicano da sole al progetto già online. Vai su
Deployments → apri l'ultimo → tre puntini (⋮) → Redeploy.

## 3. Crea l'utente Pavel su Firebase (Department Command)

Le password non sono salvate in chiaro: viene confrontato l'hash SHA-256.
Genera l'hash della password che vuoi usare (es. con un tool online
affidabile o `echo -n "tuapassword" | sha256sum` da terminale) e:

```bash
curl -X PUT \
  -d '{"passwordHash":"INCOLLA_QUI_L_HASH"}' \
  "https://TUO-PROGETTO.firebasedatabase.app/users/Pavel.json"
```

Nota: con le regole chiuse sotto, questo comando funziona solo se lanciato
con un token admin (es. dalla Firebase Console → Realtime Database → tre
puntini → "Importa JSON", incollando `{"passwordHash":"..."}` dentro al
nodo `users/Pavel`), non più direttamente via `curl` anonimo come prima.

## 4. Regole Firebase (Realtime Database → Regole)

Ora **tutto** è chiuso alla lettura/scrittura pubblica: solo le funzioni
serverless (che usano le credenziali admin) possono leggere e scrivere.

```json
{
  "rules": {
    "users": { ".read": false, ".write": false },
    "applications": { ".read": false, ".write": false }
  }
}
```

Prima `applications` aveva `.read: true`, il che significava che chiunque
conoscesse l'URL del tuo database poteva leggere tutte le candidature
(nomi, ID Discord, età, risposte) senza fare login. Con `/api/applications`
non serve più: la pagina Command ora passa sempre dal server.

## 5. Pubblica su Vercel

```bash
npm install -g vercel     # solo la prima volta
cd lspd-site
vercel --prod
```

oppure importa il repo GitHub dalla dashboard Vercel (Framework Preset:
**Other**, Build Command e Output Directory vuoti).

**Quando carichi i file su GitHub, selezionali tutti insieme e trascinali in
un solo upload** (compresa la cartella `api/` con dentro tutti i file) — se
li carichi in più tentativi separati GitHub rinomina i doppioni in
`file (1).ext` e il progetto non funziona più.

## 6. Testa

Vai su `/command`, fai login con l'utente che hai creato. Se dà ancora
errore, mandami uno screenshot di Vercel → Deployments → il tuo deploy →
Functions → clic sulla funzione che fallisce → i log.

## Ottimizzazione iPhone / iPad / tablet

- Menu di navigazione: sotto i 760px diventa un pannello a scomparsa (☰) invece di andare a capo
- Campi di testo del bando e del login: font-size 16px sotto i 600px, per impedire lo zoom automatico di Safari su iPhone quando tocchi un campo
- `viewport-fit=cover` + `env(safe-area-inset-*)`: contenuto non finisce sotto la Dynamic Island / il notch
- Icona home schermata (apple-touch-icon) impostata sul logo del sito
- Griglie (requisiti, candidature) passano a colonna singola sui telefoni, due colonne su iPad/tablet

## Logo

Il logo del sito (header + icona) usa questo indirizzo:
`https://cdn.phototourl.com/free/2026-08-30-c218c141-154a-4354-983e-1d187be89cde.webp`

Se in futuro quel link scade o cambia, ti conviene salvare l'immagine
dentro il repo (es. `img/logo.webp`) e cambiare i riferimenti nei tre file
HTML da quell'URL a `/img/logo.webp`, così il logo non dipende più da un
servizio esterno.

## Sul rilevatore AI — leggi questo prima di usarlo

La percentuale che vedi in fondo a ogni candidatura (sito e Discord) è
un'euristica su lunghezza delle frasi, varietà del vocabolario e frasi
fatte tipiche dei testi generati — **non è un rilevatore affidabile**.
Nessun AI-detector lo è davvero, nemmeno quelli commerciali: danno falsi
positivi anche su testo scritto da persone normali, specie chi scrive in
modo molto ordinato o non è madrelingua. Usalo come spunto per rileggere
con più attenzione una risposta, mai come prova per scartare o accusare un
candidato.

## Note

- Il countdown dei 45 minuti parte all'apertura di `bando.html`. È salvato
  in `sessionStorage`: un refresh non lo fa ripartire da capo, ma se il
  candidato chiude la scheda del browser e la riapre in una sessione
  nuova, il countdown si azzera (limitazione di un sito senza account per
  i candidati — se vuoi che il tempo sia legato in modo definitivo a ogni
  tentativo, serve salvare lo start-time lato server, dimmelo e lo
  aggiungo).
- La sessione del Command dura 12 ore dal login (token firmato lato
  server), poi va rifatto il login.
