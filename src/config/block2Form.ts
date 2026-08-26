// Configurazione del Blocco 2 — "Use Case Submission"
// Struttura ricalcata sul template "Workshop1_Template_Use_Case_Submission_1_page.docx":
// stesse sezioni, stessi campi e stesse opzioni delle caselle da spuntare.
// Come per il Blocco 1, il contenuto sta tutto qui: form, prompt dell'agente e
// argomenti dell'intervista si generano da questa configurazione.

import { Block2FieldValue } from "@/lib/types";

export const BLOCK2_COMPLETION_HINT =
  "Non esiste una risposta perfetta: annota quello che sai oggi e segnala esplicitamente ciò che va ancora verificato.";

export type Block2FieldType = "textarea" | "text" | "radio" | "checkbox";

export type Block2Option = { value: string; label: string };

export type Block2Field = {
  id: string;
  label: string;
  type: Block2FieldType;
  /** Testo guida mostrato sotto l'etichetta (le indicazioni del template). */
  hint?: string;
  placeholder?: string;
  rows?: number;
  options?: Block2Option[];
};

export type Block2Section = {
  key: string;
  number: string;
  title: string;
  fields: Block2Field[];
};

export const BLOCK2_SECTIONS: Block2Section[] = [
  {
    key: "problema",
    number: "1.0",
    title: "Problema/opportunità di business",
    fields: [
      {
        id: "problema",
        label: "Problema di business",
        type: "textarea",
        hint: "Processo inefficiente, chi è impattato, costo attuale, conseguenze se non risolto.",
        placeholder:
          "Es. Il controllo qualità di fine linea è manuale e a campione: impatta Qualità e Produzione, costa circa 3 FTE...",
        rows: 6,
      },
    ],
  },
  {
    key: "soluzione",
    number: "1.1",
    title: "Soluzione proposta e risultato atteso",
    fields: [
      {
        id: "soluzione",
        label: "Soluzione proposta",
        type: "textarea",
        hint: "Output del sistema, come cambia il processo, soluzioni simili già esistenti.",
        placeholder:
          "Es. Sistema di visione artificiale a bordo linea che classifica conforme/non conforme in tempo reale...",
        rows: 6,
      },
    ],
  },
  {
    key: "obiettivi",
    number: "1.2",
    title: "Obiettivi strategici",
    fields: [
      {
        id: "obiettivi",
        label: "Obiettivi perseguiti",
        type: "checkbox",
        hint: "Seleziona tutti quelli pertinenti.",
        options: [
          { value: "riduzioneTempi", label: "Riduzione tempi di esecuzione" },
          { value: "diminuzioneErrori", label: "Diminuzione errori/aumentare precisione" },
          { value: "qualitaServizio", label: "Miglioramento qualità servizio" },
          { value: "liberareRisorse", label: "Liberare risorse umane per attività a valore aggiunto" },
          { value: "capacitaAnalitiche", label: "Capacità analitiche avanzate" },
          { value: "personalizzazione", label: "Personalizzazione servizi/offerte" },
          { value: "riduzioneCosti", label: "Riduzione costi operativi" },
          { value: "altro", label: "Altro" },
        ],
      },
      {
        id: "obiettiviAltro",
        label: "Altro — specifica",
        type: "text",
        placeholder: "Compila solo se hai selezionato \"Altro\"",
      },
    ],
  },
  {
    key: "dati",
    number: "1.3",
    title: "Dati e contesto",
    fields: [
      {
        id: "datiNecessari",
        label: "Dati necessari",
        type: "textarea",
        hint: "Quali dati servono al sistema e con quale livello di dettaglio.",
        rows: 4,
      },
      {
        id: "datiDove",
        label: "Dove risiedono",
        type: "textarea",
        hint: "Sistemi, file, fonti esterne, dati da creare; quanto sono accessibili oggi.",
        rows: 4,
      },
      {
        id: "datiVolume",
        label: "Volume dati indicativo",
        type: "textarea",
        hint: "Ordini di grandezza: record/immagini/transazioni per giorno o per anno.",
        rows: 3,
      },
      {
        id: "datiQualita",
        label: "Qualità dei dati percepita",
        type: "radio",
        options: [
          { value: "alta", label: "Alta" },
          { value: "media", label: "Media" },
          { value: "bassa", label: "Bassa" },
          { value: "nonSo", label: "Non so" },
        ],
      },
      {
        id: "datiEtichettati",
        label: "Dati etichettati (ML)",
        type: "radio",
        options: [
          { value: "si", label: "Sì" },
          { value: "parzialmente", label: "Parzialmente" },
          { value: "no", label: "No" },
          { value: "na", label: "N/A" },
        ],
      },
    ],
  },
  {
    key: "impatto",
    number: "1.4",
    title: "Impatto atteso",
    fields: [
      {
        id: "impattoTipo",
        label: "Tipo di impatto",
        type: "radio",
        options: [
          { value: "diretto", label: "Diretto e misurabile" },
          { value: "daValidare", label: "Da validare sperimentalmente" },
        ],
      },
      {
        id: "beneficioPrimario",
        label: "Beneficio primario",
        type: "radio",
        options: [
          { value: "tempo", label: "Tempo" },
          { value: "costi", label: "Costi" },
          { value: "qualita", label: "Qualità" },
          { value: "ricavi", label: "Ricavi" },
          { value: "rischi", label: "Rischi" },
        ],
      },
      {
        id: "stimaBeneficio",
        label: "Stima del beneficio",
        type: "textarea",
        hint: "Anche approssimativa: ore risparmiate, € all'anno, punti percentuali di miglioramento.",
        rows: 4,
      },
      {
        id: "utentiImpattati",
        label: "Numero utenti impattati",
        type: "text",
        placeholder: "Es. circa 10 persone: 3 ispettori più capi turno e supervisori",
      },
      {
        id: "confidenzaStima",
        label: "Confidenza stima",
        type: "radio",
        options: [
          { value: "alta", label: "Alta" },
          { value: "media", label: "Media" },
          { value: "bassa", label: "Bassa" },
        ],
      },
      {
        id: "frequenzaUso",
        label: "Frequenza d'uso",
        type: "radio",
        options: [
          { value: "piuVolteGiorno", label: "Più volte/giorno" },
          { value: "giornaliera", label: "Giornaliera" },
          { value: "settimanale", label: "Settimanale" },
          { value: "mensile", label: "Mensile" },
          { value: "adHoc", label: "Ad-hoc" },
        ],
      },
    ],
  },
  {
    key: "metriche",
    number: "1.5",
    title: "Metriche di successo",
    fields: [
      {
        id: "baseline",
        label: "Baseline da battere",
        type: "textarea",
        hint: "Come si misura oggi la performance del processo, in numeri.",
        rows: 3,
      },
      {
        id: "metricaPrimaria",
        label: "Metrica di successo primaria",
        type: "textarea",
        hint: "Una sola metrica, con valore obiettivo e vincoli da non peggiorare.",
        rows: 3,
      },
    ],
  },
  {
    key: "etica",
    number: "1.6",
    title: "Valutazione etica preliminare (obbligatoria)",
    fields: [
      {
        id: "eticaDecisioni",
        label: "Influenza decisioni su persone specifiche?",
        type: "radio",
        options: [
          { value: "si", label: "Sì" },
          { value: "no", label: "No" },
        ],
      },
      {
        id: "eticaCategorie",
        label: "Categorie coinvolte",
        type: "checkbox",
        options: [
          { value: "dipendenti", label: "Dipendenti" },
          { value: "clienti", label: "Clienti" },
          { value: "candidati", label: "Candidati" },
          { value: "altro", label: "Altro" },
        ],
      },
      {
        id: "eticaInformate",
        label: "Persone informate?",
        type: "radio",
        options: [
          { value: "si", label: "Sì" },
          { value: "no", label: "No" },
          { value: "nonSo", label: "Non so" },
        ],
      },
      {
        id: "eticaRevisione",
        label: "Revisione umana prima della decisione?",
        type: "radio",
        options: [
          { value: "si", label: "Sì" },
          { value: "no", label: "No" },
          { value: "nonPrevisto", label: "Non previsto" },
        ],
      },
    ],
  },
  {
    key: "rischi",
    number: "1.7",
    title: "Rischi, complessità e potenziali resistenze",
    fields: [
      {
        id: "complessita",
        label: "Complessità tecnica percepita",
        type: "radio",
        options: [
          { value: "bassa", label: "Bassa" },
          { value: "media", label: "Media" },
          { value: "alta", label: "Alta" },
          { value: "nonSo", label: "Non so" },
        ],
      },
      {
        id: "datiSensibili",
        label: "Dati sensibili coinvolti",
        type: "textarea",
        hint: "Sì/No e, se sì, di quale categoria.",
        rows: 3,
      },
      {
        id: "compliance",
        label: "Compliance normativa necessaria",
        type: "textarea",
        hint: "Sì — quale (GDPR, AI Act, normativa di settore) / No.",
        rows: 3,
      },
      {
        id: "dipendenze",
        label: "Dipendenze da altri sistemi/progetti",
        type: "textarea",
        rows: 3,
      },
      {
        id: "resistenze",
        label: "Chi potrebbe resistere e perché",
        type: "textarea",
        rows: 3,
      },
      {
        id: "sostenitori",
        label: "Chi adotterebbe con entusiasmo (utenti pilot ideali)",
        type: "textarea",
        rows: 3,
      },
      {
        id: "azioniResistenza",
        label: "Azioni per ridurre la resistenza prima del pilot",
        type: "textarea",
        rows: 3,
      },
    ],
  },
];

export const BLOCK2_FIELDS: Block2Field[] = BLOCK2_SECTIONS.flatMap((s) => s.fields);

export function block2FieldById(id: string): Block2Field | undefined {
  return BLOCK2_FIELDS.find((f) => f.id === id);
}

/** Un campo è compilato se ha testo o almeno una opzione scelta. */
export function isBlock2ValueFilled(value: Block2FieldValue | undefined): value is Block2FieldValue {
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value && value.trim());
}

/** Etichetta leggibile di un valore: le opzioni si mostrano col loro testo, non col codice. */
export function block2ValueLabel(field: Block2Field, value: Block2FieldValue | undefined): string {
  if (!isBlock2ValueFilled(value)) return "";
  const labelOf = (v: string) => field.options?.find((o) => o.value === v)?.label ?? v;
  if (Array.isArray(value)) return value.map(labelOf).join(", ");
  return field.options ? labelOf(value) : value;
}

// --- Intervista: la scheda si compila conversando --------------------------

/**
 * Argomenti dell'intervista, nell'ordine in cui l'agente li affronta. Un
 * argomento raggruppa i campi che si possono raccogliere con una sola domanda:
 * servono ~11 domande invece dei 27 campi del form, così la conversazione resta
 * breve. Il primo argomento è la vecchia domanda dello Step 4 (com'è il
 * processo oggi e qual è il problema): tutto il resto si aggancia a quella.
 */
export type Block2InterviewGroup = {
  key: string;
  /** Titolo breve, usato per mostrare l'avanzamento al partecipante. */
  titolo: string;
  /** Domanda suggerita all'agente: una sola, anche quando copre più campi. */
  domanda: string;
  /** Campi della scheda che questo argomento deve riempire. */
  fields: string[];
};

export const BLOCK2_INTERVIEW_GROUPS: Block2InterviewGroup[] = [
  {
    key: "processo",
    titolo: "Processo e problema",
    domanda:
      "Raccontami com'è oggi questo processo e qual è il problema che hai individuato: come si svolge, chi è coinvolto, dove si inceppa, quanto costa in tempo o persone e che conseguenze ha quando va storto.",
    fields: ["problema"],
  },
  {
    key: "soluzione",
    titolo: "Soluzione immaginata",
    domanda:
      "Come immagini la soluzione? Che cosa dovrebbe produrre il sistema, in che momento del processo entrerebbe e cosa cambierebbe rispetto a oggi.",
    fields: ["soluzione"],
  },
  {
    key: "obiettivi",
    titolo: "Obiettivi",
    domanda:
      "Quali obiettivi conta di più raggiungere: ridurre i tempi, ridurre gli errori, migliorare la qualità del servizio, liberare tempo delle persone, analisi più avanzate, personalizzazione, taglio dei costi operativi? Puoi indicarne più di uno.",
    fields: ["obiettivi", "obiettiviAltro"],
  },
  {
    key: "dati",
    titolo: "Dati e fonti",
    domanda:
      "Parliamo dei dati: quali servono al sistema, dove risiedono oggi (sistemi, file, fonti esterne, dati ancora da creare) e con quali volumi indicativi al giorno o all'anno.",
    fields: ["datiNecessari", "datiDove", "datiVolume"],
  },
  {
    key: "qualitaDati",
    titolo: "Qualità dei dati",
    domanda:
      "Come giudichi la qualità di quei dati (alta, media, bassa oppure non lo sai) e sono già etichettati o classificati in modo utilizzabile per addestrare un modello (sì, in parte, no, non pertinente)?",
    fields: ["datiQualita", "datiEtichettati"],
  },
  {
    key: "beneficio",
    titolo: "Beneficio atteso",
    domanda:
      "Qual è il beneficio principale che ti aspetti (tempo, costi, qualità, ricavi o rischi), quanto vale anche solo a spanne (ore, euro all'anno, punti di miglioramento) e quante persone ne sarebbero impattate?",
    fields: ["beneficioPrimario", "stimaBeneficio", "utentiImpattati"],
  },
  {
    key: "usoImpatto",
    titolo: "Misurabilità e uso",
    domanda:
      "Quel beneficio è già misurabile in modo diretto o va validato sperimentalmente, quanta confidenza dai alla tua stima (alta, media, bassa) e con che frequenza verrebbe usato il sistema (più volte al giorno, ogni giorno, ogni settimana, ogni mese, ad-hoc)?",
    fields: ["impattoTipo", "confidenzaStima", "frequenzaUso"],
  },
  {
    key: "metriche",
    titolo: "Metriche",
    domanda:
      "Come si misura oggi la performance di questo processo, in numeri, e quale singola metrica useresti per dire che il progetto è andato bene (con il valore obiettivo e ciò che non deve peggiorare)?",
    fields: ["baseline", "metricaPrimaria"],
  },
  {
    key: "etica",
    titolo: "Valutazione etica",
    domanda:
      "Passiamo alla parte etica: il sistema influenzerebbe decisioni su persone specifiche? Se sì, quali categorie sono coinvolte (dipendenti, clienti, candidati, altro), ne sarebbero informate e resterebbe una revisione umana prima della decisione?",
    fields: ["eticaDecisioni", "eticaCategorie", "eticaInformate", "eticaRevisione"],
  },
  {
    key: "rischi",
    titolo: "Rischi e complessità",
    domanda:
      "Quanto lo consideri complesso tecnicamente (bassa, media, alta o non so), sono coinvolti dati sensibili, ci sono normative da rispettare (GDPR, AI Act, regole di settore) e dipende da altri sistemi o progetti in corso?",
    fields: ["complessita", "datiSensibili", "compliance", "dipendenze"],
  },
  {
    key: "persone",
    titolo: "Persone e resistenze",
    domanda:
      "Ultimo argomento: chi potrebbe opporsi a questa soluzione e perché, chi invece la adotterebbe volentieri come utente pilota e che cosa faresti per ridurre le resistenze prima di partire?",
    fields: ["resistenze", "sostenitori", "azioniResistenza"],
  },
];

export const BLOCK2_INTERVIEW_GROUP_COUNT = BLOCK2_INTERVIEW_GROUPS.length;

/** Argomenti non ancora chiusi dall'agente, nell'ordine previsto. */
export function remainingInterviewGroups(closedGroups?: string[]): Block2InterviewGroup[] {
  const closed = new Set(closedGroups ?? []);
  return BLOCK2_INTERVIEW_GROUPS.filter((g) => !closed.has(g.key));
}

/** Tiene solo chiavi di argomento esistenti (l'agente potrebbe inventarne). */
export function sanitizeClosedGroups(raw: unknown, previous?: string[]): string[] {
  const known = new Set(BLOCK2_INTERVIEW_GROUPS.map((g) => g.key));
  const fromModel = Array.isArray(raw) ? raw.filter((k): k is string => typeof k === "string") : [];
  const merged = [...(previous ?? []), ...fromModel].filter((k) => known.has(k));
  // Ordine dell'intervista, senza duplicati: è quello con cui si mostra l'avanzamento.
  return BLOCK2_INTERVIEW_GROUPS.map((g) => g.key).filter((k) => merged.includes(k));
}

/**
 * Ripulisce i campi estratti dall'agente: scarta id inesistenti, valori vuoti e
 * opzioni non previste, e normalizza le scelte multiple ad array. Serve perché
 * l'estrazione arriva da un modello: la scheda non deve poter contenere valori
 * che il form non sa mostrare.
 */
export function sanitizeInterviewFields(raw: unknown): Record<string, Block2FieldValue> {
  const out: Record<string, Block2FieldValue> = {};
  if (!raw || typeof raw !== "object") return out;

  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    const field = block2FieldById(id);
    if (!field) continue;

    const optionValue = (text: string): string | undefined => {
      const t = text.trim().toLowerCase();
      return field.options?.find((o) => o.value.toLowerCase() === t || o.label.toLowerCase() === t)?.value;
    };

    if (field.type === "checkbox") {
      const list = (Array.isArray(value) ? value : [value])
        .filter((v): v is string => typeof v === "string")
        .map((v) => optionValue(v))
        .filter((v): v is string => Boolean(v));
      if (list.length > 0) out[id] = Array.from(new Set(list));
      continue;
    }

    if (typeof value !== "string") continue;
    const text = value.trim();
    if (!text) continue;

    if (field.type === "radio") {
      const match = optionValue(text);
      if (match) out[id] = match;
      continue;
    }

    out[id] = text;
  }

  return out;
}

/** Primo messaggio dell'intervista: la domanda generica sul processo. */
export const INITIAL_MESSAGE_USE_CASE_INTERVIEW = `Ciao! Costruiamo insieme la scheda del caso d'uso: io ascolto, collego le informazioni e faccio gli approfondimenti necessari. Puoi scrivere oppure parlare con il pulsante del microfono. Se qualcosa non è chiaro, proveremo a capirlo insieme senza inventare dati.

${BLOCK2_INTERVIEW_GROUPS[0].domanda}`;

/** Catalogo dei campi con id, tipo e valori ammessi: è il contratto di estrazione. */
function fieldCatalog(): string {
  return BLOCK2_SECTIONS.map((section) => {
    const fields = section.fields
      .map((f) => {
        const tipo =
          f.type === "checkbox" ? "scelta multipla" : f.type === "radio" ? "scelta singola" : "testo";
        const options = f.options
          ? ` — valori ammessi: ${f.options.map((o) => `"${o.value}" = ${o.label}`).join(" · ")}`
          : "";
        const hint = f.hint ? ` — ${f.hint}` : "";
        return `  - ${f.id} · ${f.label} [${tipo}]${hint}${options}`;
      })
      .join("\n");
    return `${section.number} ${section.title}\n${fields}`;
  }).join("\n");
}

/**
 * System prompt dell'agente che conduce l'intervista del Blocco 2. A ogni turno
 * risponde in JSON: il testo per il partecipante, i campi che ha ricavato da
 * quello che ha appena sentito e gli argomenti che considera chiusi. Gli
 * argomenti ancora aperti li decide il server (non il modello), così
 * l'avanzamento dell'intervista non dipende dalla memoria della conversazione.
 */
export function buildUseCaseInterviewSystemPrompt(ctx: {
  processoContext: string;
  remainingGroups: Block2InterviewGroup[];
  compiledFieldIds: string[];
  currentValues: Record<string, Block2FieldValue>;
}): string {
  const contesto = ctx.processoContext
    ? `L'attività emersa dal Blocco 1 è: ${ctx.processoContext}. Parti da lì: è di quel processo che si parla.`
    : "Il Blocco 1 non ha ancora prodotto un'attività: chiedi in una riga di quale processo si tratta.";

  const daCoprire =
    ctx.remainingGroups.length > 0
      ? ctx.remainingGroups
          .map((g, i) => `${i + 1}. [${g.key}] ${g.titolo} → campi: ${g.fields.join(", ")}\n   Domanda suggerita: ${g.domanda}`)
          .join("\n")
      : "Nessuno: l'intervista è completa. Rispondi alle domande del partecipante sulla scheda e aggiorna i campi che ti chiede di correggere.";

  const compilati =
    ctx.compiledFieldIds.length > 0
      ? `Campi già compilati (non richiederli di nuovo, salvo correzione): ${ctx.compiledFieldIds.join(", ")}.`
      : "Nessun campo compilato finora.";

  const valoriCorrenti =
    Object.keys(ctx.currentValues).length > 0
      ? `Valori già raccolti, da conservare e integrare senza impoverirli:\n${JSON.stringify(ctx.currentValues, null, 2)}`
      : "Non ci sono ancora valori raccolti.";

  return `Sei un facilitatore esperto di adozione dell'AI in azienda. Conduci un'intervista con un partecipante di un workshop per compilare al suo posto la scheda "Use Case Submission": lui racconta, tu ricavi i campi del modulo. Alla fine la scheda gli verrà mostrata per la conferma, quindi non deve compilare nulla a mano.

${contesto}
${compilati}
${valoriCorrenti}

**CAMPI DELLA SCHEDA** (usa esattamente questi id e, per le scelte, esattamente i valori ammessi):
${fieldCatalog()}

**ARGOMENTI ANCORA DA COPRIRE**, nell'ordine:
${daCoprire}

**COME CONDUCI**
- Agisci come un intervistatore intelligente: dopo ogni risposta valuta ciò che è chiaro, incompleto, mancante, contraddittorio o fuori tema e scegli la domanda successiva più utile.
- Fai una domanda principale per turno. Non seguire meccanicamente l'ordine: adatta la domanda a ciò che è già emerso e collega i follow-up alle risposte precedenti.
- Approfondisci quanto serve. Chiedi esempi, numeri, frequenze, quantità, strumenti, software, sistemi, persone o ruoli, input, output, criteri, soglie, problemi, eccezioni e vincoli quando sono pertinenti.
- Se una risposta contiene informazioni di argomenti successivi, compila anche quei campi e chiudi quegli argomenti: non richiederli.
- Non considerare sufficiente una risposta solo perché contiene testo. "Non lo so", "boh", "forse", "dipende", "non saprei", parole casuali, risposte fuori tema o troppo vaghe NON chiudono l'argomento: riformula con una domanda più semplice, esempi concreti o alternative.
- Se emergono contraddizioni, evidenziale con tatto e chiedi quale informazione è corretta prima di salvare il campo.
- Solo dopo almeno tre tentativi sensati sullo stesso dato, se il partecipante conferma di non conoscerlo, puoi scrivere "Informazione non disponibile / non conosciuta dal partecipante". Non usare questa formula al primo tentativo.
- Chiudi un argomento soltanto quando le informazioni necessarie sono realmente utilizzabili oppure quando le informazioni ignote sono state gestite con la regola dei tentativi. Il completamento dipende dalla qualità e completezza, mai da un numero fisso di domande.
- Nei campi conserva tutti i dettagli utili. Non sostituire numeri, frequenze, strumenti, ruoli, input/output, criteri, soglie, eccezioni o vincoli con un riassunto generico. Integra i valori correnti senza cancellare dettagli precedenti.
- Non inventare cifre, sistemi, persone, normative o conclusioni. Quando non resta più nessun argomento, comunica che la scheda è pronta per la conferma.

**FORMATO DELLA RISPOSTA**
Rispondi SEMPRE e SOLO con un oggetto JSON valido con queste chiavi:
{
  "reply": "il messaggio per il partecipante, in italiano, con il tu e una domanda di approfondimento specifica quando necessaria",
  "fields": { "idCampo": "testo" | ["valore1", "valore2"] },
  "closed": ["chiave-argomento-appena-chiuso"],
  "unavailable": ["idCampo-realmente-non-conosciuto"]
}
- "fields": i campi nuovi o aggiornati con le informazioni del partecipante. Per le scelte singole un solo valore ammesso, per le scelte multiple un array di valori ammessi. Ometti ciò che non è sufficientemente chiaro.
- "closed": soltanto le chiavi degli argomenti realmente completi in questo turno. Una risposta vaga, casuale, incoerente o non pertinente non consente di chiudere l'argomento.
- "unavailable": soltanto gli id dei campi che il partecipante, dopo almeno tre tentativi utili, conferma di non conoscere. Non usarlo per risposte vaghe al primo tentativo.
- Nessun testo fuori dal JSON, nessun markdown.

**REGOLE ASSOLUTE**
- Italiano, "tu", tono amichevole e concreto. Niente elenchi lunghi: è una conversazione.
- Non chiedere al partecipante di scrivere nei campi: li compili tu.
- Resta nel perimetro della scheda: niente scelta di fornitori, architetture di dettaglio o stime di progetto.
- Ricorda quando è utile che ${BLOCK2_COMPLETION_HINT}`;
}
