# Workshop AI Adoption — IFAB Foundation

App interattiva per condurre dal vivo il workshop di AI Adoption. Il facilitatore sblocca gli step uno alla volta, i partecipanti (identificati dal solo nome) compilano ogni step con un assistente AI a fianco.

## Come funziona il percorso (Step 1-4)

Gli Step 1-3 sono il Blocco 1 (scheda di attrito); lo Step 4 raccoglie il caso d'uso e sostituisce il vecchio Blocco 2.

- **Step 1 — Scheda di attrito**: domande sì/no in elenco unico (i quattro blocchi restano interni). Su ogni sì si apre un nome facoltativo per l'attività e lo **slider Impatto 1-10**, senza valore preimpostato: va mosso. Tornando al no, i campi si chiudono e il dato viene scartato. Contatore risposte in alto, avviso non bloccante oltre 8 sì, messaggio dedicato se non c'è nessun sì.
- **Step 2 — Caratteristiche delle tre candidate**: le tre attività con impatto più alto (a parità vince quella dichiarata prima), una scheda alla volta con navigazione avanti/indietro. Un solo slider per scheda, deciso dal blocco della domanda di origine (costanza del formato · disponibilità dei dati · template e fonti · esplicitezza dei criteri). Nessun punteggio o anteprima; concludendo lo step le risposte si bloccano e le candidate vengono congelate.
- **Step 3 — Esito e scelta**: **matrice Impatto × Prontezza in SVG inline** con i quattro quadranti nominati e le candidate posizionate, poi una scheda per candidata in ordine di punteggio con la riga di motivazione che spiega la posizione. Il sistema evidenzia la candidata a punteggio più alto, ma la decisione è del partecipante: scegliendo un'altra candidata compare una conferma esplicita ("la scelta non corrisponde all'opzione con il valore più alto: vuoi procedere comunque?"). Raccomandazione e scelta si salvano separate (`Step3Choice`, in `src/lib/types.ts`) e sono entrambe visibili in dashboard e nell'export Excel. Export PDF.
- **Step 4 — Use Case**: un unico step per il caso d'uso, sull'azione scelta nello Step 3. Non c'è un modulo da compilare a mano: l'agente conduce un'intervista che parte dalla domanda generica su com'è oggi il processo e qual è il problema, fa i follow-up necessari quando una risposta è vaga o insufficiente, e da quello che il partecipante racconta ricava i campi della scheda. La scheda si apre da sola, in sola lettura, solo quando l'agente considera l'intervista completa — non prima, e non a mano. Vedi [Step 4 — Use Case: intervista e scheda](#step-4--use-case-intervista-e-scheda).

Calcolo (in `src/lib/frizioneScoring.ts`, unico punto di verità, usato anche dalla dashboard):

```
prontezza = blocco "sposti" ? max(0, 10 - |valore - 5.5| × 2) : valore   // campana: l'ottimo è al centro
punteggio = impatto × prontezza                                          // prodotto, non somma: 0-100
```

I casi limite si valutano in ordine e cambiano la lettura della posizione (non il punteggio): formato costante (≤2 su "sposti"), formato sempre diverso (≥9), valore ≤3 sugli altri blocchi. I due estremi di "sposti" ricevono lo stesso punteggio per effetto della campana ma **messaggi opposti**. Se `criteriTaciti` è vero compare la nota esplicita sulla formalizzazione dei criteri: il flag veniva dalla domanda spia "le eccezioni si gestiscono con criteri non documentati?", rimossa dal questionario attivo — resta solo per leggere correttamente le sessioni precedenti che l'avevano già registrato.

Domande, ancoraggi, tecnologie e messaggi vivono in `src/config/block1Frizione.ts`.

Il facilitatore sblocca ogni step dalla propria dashboard; i partecipanti vedono lo sblocco entro pochi secondi (polling).

## Step 4 — Use Case: intervista e scheda

Lo Step 4 e la scheda Use Case sono **un unico step**: la scheda (che ricalca il template `Workshop1_Template_Use_Case_Submission_1_page.docx`) non si compila mai a mano campo per campo, si compila conversando. Il facilitatore sblocca lo step quando il gruppo è pronto. In testa allo step compare l'**azione selezionata**: quella scelta dal partecipante nello Step 3, anche quando è diversa dall'opzione con il punteggio più alto.

**Fase 1 — intervista.** L'agente parte dalla domanda generica dello Step 4 (com'è oggi il processo, chi è coinvolto, dove si inceppa, cosa costa) e da lì chiede solo quello che non ha ancora sentito, comportandosi da intervistatore e non da questionario: usa il modello OpenAI con il miglior reasoning disponibile nell'integrazione (`REASONING_CHAT_MODEL` in `src/lib/openaiClient.ts`), fa follow-up mirati quando una risposta è vaga, fuori tema o del tipo "non lo so", e non chiude un argomento finché non ha un'informazione davvero utilizzabile (o, dopo un paio di tentativi sensati, un esplicito "informazione non disponibile"). Le domande sono raggruppate per **argomento**: un argomento raccoglie tutti i campi che si possono ottenere con una domanda sola, così bastano ~11 domande per 28 campi. Una barra in alto mostra gli argomenti coperti.

- A ogni turno l'agente risponde in **JSON**: il messaggio per il partecipante, i campi che ha ricavato e gli argomenti che considera chiusi. I campi passano da `sanitizeInterviewFields` (id inesistenti, valori vuoti e opzioni non previste vengono scartati): nella scheda non può finire un valore che il form non sa mostrare.
- **Gli argomenti ancora aperti li decide il server**, dai `closedGroups` accumulati nella submission, non il modello: l'avanzamento (e quindi il passaggio alla scheda) non dipende da quanto il modello ricorda della conversazione. Il client tiene anche il conteggio dei tentativi già fatti sull'argomento corrente (`currentGroupAttempts`); il server usa lo stesso conteggio come rete di sicurezza per non lasciar chiudere un argomento su una risposta palesemente vuota ("non lo so" e simili, vedi `isTrivialAnswer` in `src/config/block2Form.ts`) prima che siano stati fatti almeno un paio di tentativi.
- Se una risposta contiene informazioni di argomenti successivi, l'agente compila anche quei campi e non li richiede.
- I campi si scrivono mantenendo i dettagli concreti della risposta (numeri, strumenti, ruoli, soglie, eccezioni...), non riassunti generici: vedi le istruzioni in `buildUseCaseInterviewSystemPrompt`.
- Argomenti, domande suggerite, catalogo dei campi e prompt vivono in `src/config/block2Form.ts`: modificare lì testi, opzioni o raggruppamenti aggiorna form, intervista e conteggi, senza toccare componenti o API.

**Fase 2 — scheda da confermare.** Solo quando l'agente ritiene l'intervista completa (nessun modo per il partecipante di saltarla prima) si apre da sola la scheda, con la stessa struttura del template — 1.0 Problema/opportunità di business · 1.1 Soluzione proposta · 1.2 Obiettivi strategici · 1.3 Dati e contesto · 1.4 Impatto atteso · 1.5 Metriche di successo · 1.6 Valutazione etica preliminare · 1.7 Rischi, complessità e resistenze — con le informazioni raccolte già organizzate nei campi.

- I campi sono in **sola lettura**: nessuna compilazione manuale. Per correggere o aggiungere qualcosa si torna a parlarne con l'assistente ("Torna alla conversazione" o "Chiedi all'assistente" per sezione, con la domanda già scritta), poi si torna qui da soli quando l'agente riconferma il completamento.
- Si conferma con "Confermo la scheda"; la bozza si autosalva come negli altri step.
- In fondo alla scheda, **"Scarica PDF"**: il PDF si compone con le primitive testuali di jsPDF (`src/lib/useCasePdf.ts`), non fotografando il DOM, così va su più pagine, il testo resta selezionabile e riporta anche l'esito dello Step 3 (raccomandazione del sistema e scelta del partecipante, coi rispettivi punteggi).
- La fase raggiunta (`interviewDone`) vive lato server: il rientro riapre la scheda invece di ricominciare la conversazione.
- La dashboard del facilitatore mostra ✅ per le schede confermate, `n/N` per quelle in bozza, la raccomandazione dello Step 3 a confronto con la scelta del partecipante (con un'icona quando divergono), e un pulsante **PDF per ogni partecipante** che scarica la sua scheda dai dati salvati (non serve che la pagina del partecipante sia aperta). Lo stesso confronto raccomandazione/scelta è nell'export Excel (**"Esporta dashboard"**, `src/lib/dashboardExport.ts`).

## Interazione vocale

Ogni chat (l'intervista dello Step 4 e gli assistenti degli Step 1 e 2) ha un **pulsante col microfono**: si parla e il testo riconosciuto si accoda al campo di risposta, dove si rilegge e si corregge prima di inviare — in una sala con più voci l'invio automatico sarebbe un guaio. Accanto al titolo della chat c'è anche l'interruttore per farsi **leggere ad alta voce** le risposte dell'agente (spento per default).

Tutto passa dalle API del browser (Web Speech, `src/components/VoiceInput.tsx`): nessun servizio esterno, nessun audio che lascia il dispositivo. Su Chrome ed Edge funziona; dove il riconoscimento non c'è (Firefox) il pulsante non compare invece di dare errore al clic.

## Pulsante "test"

Il pulsante **test** compila con dati di esempio (`src/lib/testData.ts`) lo step che il partecipante sta guardando: Step 1, Step 2, Step 1+2 per vedere l'esito nello Step 3, o la scheda Use Case già piena. Compare solo nella vista partecipante autenticata (`/session/[code]`, dopo l'ingresso in sessione): non nella home, in `/join`, nel login del facilitatore né nella sua dashboard, per non lasciare scorciatoie prima dell'accesso vero.

I dati di esempio sono coerenti fra gli step: lo Step 2 lavora sulle candidate generate dallo Step 1 e la scheda Use Case racconta la stessa attività.

## Riprendere una sessione interrotta

Tutto lo stato vive lato server (Redis, TTL 48h): chiudere il browser, ricaricare la pagina o cambiare dispositivo non fa perdere il lavoro.

**Partecipante**
- L'identità (codice sessione + participantId + nome) resta nel `localStorage`: riaprendo l'app compare in home la card **"Riprendi"**, e su `/join` il pulsante **"Rientra nella sessione"** — senza ridigitare nulla.
- Da un altro dispositivo (o dopo aver svuotato il browser) basta rientrare su `/join` con lo **stesso codice e lo stesso nome**: il match sul nome normalizzato ricollega alla stessa submission.
- Tutti gli step **si autosalvano** dopo ~1 secondo di inattività (e all'uscita dallo step), quindi anche la bozza non ancora confermata viene ripristinata.
- Viene ripristinato anche il **punto in cui ci si era interrotti** (Step 1-3 o Step 4 Use Case, e per lo Step 4 anche la fase: intervista o scheda), salvato lato server a ogni cambio step.
- Se la sessione è scaduta o il partecipante non risulta più registrato, si viene riportati a `/join` con un avviso, invece di restare su una pagina in caricamento.

**Facilitatore**
- Il cookie di autenticazione dura 12h: rientrando su `/facilitator/login` con il cookie valido si salta la password.
- Dopo l'accesso viene mostrato l'**elenco delle sessioni ancora attive** (codice, orario, numero di partecipanti) per riprendere quella in corso; la sessione usata l'ultima volta su quel browser è marcata "ultima usata". Una nuova sessione si crea solo esplicitamente (o automaticamente se non ce n'è nessuna attiva).
- Se il codice aperto non è più valido, la dashboard propone il ritorno al selettore delle sessioni.
- Ogni sessione si può **eliminare** (icona cestino nel selettore, pulsante "Elimina" nella dashboard, con conferma in due passaggi): rimuove meta, partecipanti e submission. I partecipanti eventualmente collegati vengono riportati a `/join` al polling successivo.

## Setup locale

### Prerequisiti
- Node.js 18+
- Una chiave OpenAI API (per gli agenti)
- Un database Upstash Redis gratuito (https://console.upstash.com) — usato come store di stato condiviso per la durata dell'evento

### Installazione

```bash
npm install
cp .env.local.example .env.local
# compila OPENAI_API_KEY, FACILITATOR_PASSWORD, KV_REST_API_URL, KV_REST_API_TOKEN
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

- **Facilitatore**: vai su `/facilitator/login`, inserisci nome + `FACILITATOR_PASSWORD`. Al primo accesso viene creata una sessione con un codice a 6 caratteri da condividere con i partecipanti.
- **Partecipanti**: vanno su `/join` (o sul link copiato dal facilitatore) e inseriscono codice sessione + il proprio nome.

## Deploy su Vercel

Vedi [DEPLOYMENT.md](./DEPLOYMENT.md) per la guida passo-passo (import del repo, collegamento di un database Redis dal tab Storage di Vercel senza bisogno di un account Upstash separato, verifica end-to-end).

## Struttura del progetto

```
src/
├── app/
│   ├── page.tsx                      # landing (scelta partecipante/facilitatore)
│   ├── join/page.tsx                 # ingresso partecipante
│   ├── facilitator/login/page.tsx    # login facilitatore
│   ├── facilitator/[code]/page.tsx   # dashboard facilitatore
│   ├── session/[code]/page.tsx       # vista partecipante (step 1-3 + Step 4 Use Case)
│   └── api/                          # route handler (auth, sessione, agente AI)
│       ├── session/list              # sessioni attive: rientro del facilitatore
│       └── session/[code]/resume     # rientro del partecipante con identità salvata
├── components/                       # Step1Frizione, Step2Caratteristiche, Step3Esito,
│                                     # MatriceImpattoProntezza (SVG),
│                                     # UseCaseStep (Step 4: intervista + scheda),
│                                     # UseCaseInterview (la chat che compila la scheda),
│                                     # AgentChat, AssistantPanel (pannello fisso a destra),
│                                     # VoiceInput (microfono e lettura), TestFillButton, ResumeCard
├── config/block1Frizione.ts          # Blocco 1: domande, ancoraggi, tecnologie, messaggi, prompt
├── config/block2Form.ts              # Step 4: sezioni e campi della scheda, argomenti e prompt dell'intervista
└── lib/                              # tipi, frizioneScoring (calcolo esito), client Redis,
                                      # helper sessione, auth, client API, participantStorage,
                                      # useCasePdf (export scheda in PDF), dashboardExport (export
                                      # dashboard in Excel), testData (pulsante "test")
```

## Estendere ai blocchi successivi

L'architettura (sessione + step unlock + assistente AI per step + output) è pensata per essere riusata per i blocchi successivi (Prioritizzazione, Design, Qualità), aggiungendo nuove chiavi a `UnlockedSteps`, nuovi file di config analoghi a `block1Flow.ts`/`block2Form.ts` e nuovi componenti Step, senza toccare il modello di sessione/autenticazione.

Nota: la whitelist degli step in `/api/session/[code]/unlock` deriva da `DEFAULT_UNLOCKED_STEPS`, quindi una nuova chiave è sbloccabile senza altre modifiche. Le sessioni già in corso al momento di un cambio di struttura ripartono con tutti gli step bloccati (le chiavi non riconosciute risultano `false`): basta risbloccarli dalla dashboard.
