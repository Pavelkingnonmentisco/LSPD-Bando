# LSPD — Sito Bando + Department Command

## File
- `index.html` — pagina del bando (banner, requisiti, modulo Google Form incorporato, countdown 45 minuti)
- `command.html` + `command.js` — pagina di login "Department Command" + bacheca candidature
- `style.css` — grafica condivisa
- `script.js` — logica del countdown
- `apps-script.gs` — script da incollare nell'editor di script del tuo Google Form (invia le risposte su Discord e su Firebase)

## 1. Crea il primo utente (Pavel) su Firebase

Le password **non vanno salvate in chiaro**. Il sito confronta l'hash SHA-256
della password inserita con quello salvato su Firebase.

L'hash SHA-256 di `2009` è:
```
f37f3f2b0dc57a86dee4ba6ff855283bb4d2f0dea1c5bd1b708853444c2ffcec
```

Su un computer con `curl` (o con Postman), esegui:

```bash
curl -X PUT \
  -d '{"passwordHash":"f37f3f2b0dc57a86dee4ba6ff855283bb4d2f0dea1c5bd1b708853444c2ffcec"}' \
  "https://ciao111-default-rtdb.europe-west1.firebasedatabase.app/users/Pavel.json"
```

Per aggiungere altri agenti in futuro, ripeti lo stesso comando cambiando
`Pavel` con il nuovo username e mettendo l'hash SHA-256 della sua password
(puoi generarlo con `echo -n "password" | shasum -a 256`, oppure con
qualsiasi generatore SHA-256 online).

**Importante — imposta le regole di Firebase.** Di default un Realtime
Database appena creato è leggibile e scrivibile da chiunque conosca l'URL.
Nella console Firebase → Realtime Database → Regole, imposta qualcosa come:

```json
{
  "rules": {
    "users": { ".read": false, ".write": false },
    "applications": { ".read": true, ".write": true }
  }
}
```

Così nessuno può leggere gli hash delle password da browser. Il problema è
che, così facendo, anche la pagina di login smette di poter leggerli — per
un vero controllo sicuro serve un backend (es. una Cloud Function) che
verifichi la password lato server e non lasci mai il nodo `users` leggibile
dal client. Questa versione è pensata per un sito di roleplay/community, non
per proteggere dati sensibili reali: se un giorno gestirai dati veri, vale
la pena passare a un'autenticazione vera (es. Firebase Authentication).

## 2. Collega il Google Form a Discord e al sito

1. Apri il Google Form del bando in modalità editor.
2. Estensioni → Apps Script.
3. Incolla il contenuto di `apps-script.gs`.
4. Trigger (icona orologio) → Aggiungi trigger → `onFormSubmit`, evento
   "Alla conferma del modulo". Autorizza quando richiesto.

Da quel momento ogni risposta al bando:
- arriva come embed nel canale Discord collegato al webhook, con ping al ruolo `1528025040098955362`;
- viene salvata su Firebase sotto `/applications`, e compare automaticamente nella bacheca di `command.html` una volta effettuato il login.

## 3. Pubblica il sito su Vercel

Sono file statici, nessuna build richiesta: Vercel li serve così come sono
(c'è già `vercel.json` per avere `/command` invece di `/command.html`).

**Opzione A — da terminale (più veloce):**
```bash
npm install -g vercel     # solo la prima volta
cd lspd-site
vercel                    # segue la procedura guidata, crea il progetto
vercel --prod             # pubblica in produzione
```

**Opzione B — dalla dashboard Vercel (senza terminale):**
1. Metti questa cartella (`lspd-site`) dentro un repository su GitHub.
2. Su [vercel.com](https://vercel.com) → "Add New…" → "Project" → importa quel repository.
3. Framework Preset: **Other** (sito statico, nessuna build da eseguire, "Build Command" e "Output Directory" vanno lasciati vuoti).
4. Deploy.

Dopo il deploy il sito sarà raggiungibile su `https://<nome-progetto>.vercel.app`,
con `/` per il bando e `/command` per Department Command.

## Note

- Il countdown dei 45 minuti parte alla prima apertura della pagina del
  bando per ogni visitatore (salvato in `sessionStorage`), non è un
  countdown globale collettivo.
- Se vuoi che il bando si chiuda per **tutti** a una certa data fissa
  (invece che 45 minuti dopo l'apertura per ciascuno), dimmelo e adatto lo
  script a un countdown con scadenza assoluta.
