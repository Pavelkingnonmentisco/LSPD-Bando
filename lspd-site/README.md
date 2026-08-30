# LSPD — Sito Bando + Department Command

## File
- `index.html` — home: hero, banner, requisiti, bottone "Inizia Bando LSPD" (link a `/bando`)
- `bando.html` + `bando.js` — pagina separata col modulo di candidatura vero e proprio: il countdown di 45 minuti parte da solo appena questa pagina si apre (cioè appena si clicca il bottone in home)
- `command.html` + `command.js` — login "Department Command" + bacheca candidature (con la stima AI in fondo a ogni scheda)
- `style.css` — grafica condivisa
- `api/submit.js` — funzione serverless Vercel: riceve le risposte, calcola la stima AI, manda l'embed su Discord e salva su Firebase
- `api/login.js` — funzione serverless Vercel: verifica username+password del Command lato server (vedi sezione 1 sotto — è il fix del 401)
- `vercel.json` — config per URL puliti (`/command`, `/bando` invece di `.html`)

## ⚠️ Prima di pubblicare: metti le domande vere

Le domande sono in cima a `bando.js`, nell'array `QUESTIONS`. Al momento
contiene domande segnaposto basate sulla descrizione del bando — sostituiscile
con quelle esatte del tuo modulo. Ogni domanda è un oggetto con `id`, `title`,
`type` (`text` / `textarea` / `radio`) e, per i radio, `options`.

## 1. Crea il primo utente (Pavel) su Firebase — solo per Department Command

Le password non sono salvate in chiaro: viene confrontato l'hash SHA-256.
L'hash SHA-256 di `2009` è:
```
f37f3f2b0dc57a86dee4ba6ff855283bb4d2f0dea1c5bd1b708853444c2ffcec
```

```bash
curl -X PUT \
  -d '{"passwordHash":"f37f3f2b0dc57a86dee4ba6ff855283bb4d2f0dea1c5bd1b708853444c2ffcec"}' \
  "https://ciao111-default-rtdb.europe-west1.firebasedatabase.app/users/Pavel.json"
```

**Imposta le regole di Firebase** (console Firebase → Realtime Database →
Regole) così il nodo `users` non è leggibile da browser:
```json
{
  "rules": {
    "users": { ".read": false, ".write": false },
    "applications": { ".read": true, ".write": true }
  }
}
```

### Il 401 su `/users/Pavel.json` — perché succedeva e come è risolto ora

Con `users` non leggibile (giusto, per sicurezza), il browser non può più
verificare le password direttamente: è per questo che vedevi **401
Unauthorized**. Ora il login passa da `/api/login.js`, una funzione
serverless che gira sul server (non nel browser) e legge `users` bypassando
le regole grazie a un **service account** (le credenziali "admin" di
Firebase — funzionano su ogni progetto, anche i più recenti, a differenza
dei vecchi "database secret" che Google ha nascosto in molte console):

1. Firebase Console → icona ingranaggio (in alto a sinistra) →
   **Impostazioni progetto** → scheda **Account di servizio**.
2. Clicca **"Genera nuova chiave privata"** → si scarica un file `.json`.
3. Apri quel file, copia **tutto** il contenuto (è un unico blocco JSON).
4. Su Vercel → progetto → Settings → Environment Variables, crea:
   - `FIREBASE_SERVICE_ACCOUNT_KEY` → incolla lì tutto il contenuto del
     file JSON (deve restare su un'unica riga: se il campo di Vercel va a
     capo da solo va bene, basta non modificarne il contenuto)
   - `FIREBASE_URL` → `https://ciao111-default-rtdb.europe-west1.firebasedatabase.app`
     (se non l'hai già impostata)
5. Rifai il deploy (Deployments → ultimo deploy → ⋮ → Redeploy).

Senza `FIREBASE_SERVICE_ACCOUNT_KEY`, `/api/login` risponde sempre
"Credenziali non valide" per chiunque, perché non riesce a leggere `users`.

**Non condividere mai quel file `.json`**: chi lo ottiene ha accesso admin
completo al tuo Firebase, non solo al nodo `users`.

## 2. Il webhook Discord — sposta il segreto in una variabile d'ambiente

`api/submit.js` funziona già "out of the box" col webhook e col Firebase URL
scritti nel file, ma **è meglio spostarli in variabili d'ambiente** così non
restano nel codice pubblico su GitHub:

Su Vercel → progetto → Settings → Environment Variables, aggiungi:
- `DISCORD_WEBHOOK_URL` → il tuo URL webhook
- `DISCORD_ROLE_ID` → `1528025040098955362`
- `FIREBASE_URL` → `https://ciao111-default-rtdb.europe-west1.firebasedatabase.app`

Poi rifai il deploy. Il codice le legge già in automatico se presenti
(`process.env.DISCORD_WEBHOOK_URL`, ecc.), altrimenti usa i valori scritti
nel file come fallback.

## 3. Pubblica su Vercel

File statici + una funzione serverless in `api/` = zero configurazione
aggiuntiva, Vercel la riconosce da sola.

```bash
npm install -g vercel     # solo la prima volta
cd lspd-site
vercel --prod
```

oppure importa il repo GitHub dalla dashboard Vercel (Framework Preset:
**Other**, Build Command e Output Directory vuoti). Root Directory: `./` se
i file sono alla radice del repo, altrimenti il nome della cartella.

**Quando carichi i file su GitHub, selezionali tutti insieme e trascinali in
un solo upload** (compresa la cartella `api/` con dentro `submit.js`) — se li
carichi in più tentativi separati GitHub rinomina i doppioni in `file (1).ext`
e il progetto non funziona più.

## Sul rilevatore AI — leggi questo prima di usarlo

La percentuale che vedi in fondo a ogni candidatura (sito e Discord) è
un'euristica su lunghezza delle frasi, varietà del vocabolario e frasi fatte
tipiche dei testi generati — **non è un rilevatore affidabile**. Nessun
AI-detector lo è davvero, nemmeno quelli commerciali: danno falsi positivi
anche su testo scritto da persone normali, specie chi scrive in modo molto
ordinato o non è madrelingua. Usalo come spunto per rileggere con più
attenzione una risposta, mai come prova per scartare o accusare un
candidato.

## Note

- Il countdown dei 45 minuti parte all'apertura di `bando.html`, cioè
  appena si clicca "Inizia Bando LSPD" in home. È salvato in `sessionStorage`: un refresh non
  lo fa ripartire da capo, ma se il candidato chiude proprio la scheda del
  browser e la riapre in una sessione nuova, il countdown si azzera (è una
  limitazione di un sito senza account per i candidati — se vuoi che il
  tempo sia legato in modo definitivo a ogni singolo tentativo, serve
  salvare lo start-time lato server, dimmelo e lo aggiungo).
