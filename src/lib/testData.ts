// Dati di test e di esempio usati dal pulsante "test" presente in alto in ogni
// pagina. Servono a percorrere il tool senza compilare tutto a mano (prove,
// demo, verifica del deploy): stanno qui, in un unico punto, e non in mezzo ai
// componenti, così restano coerenti fra gli step — lo Step 2 lavora sulle
// candidate dello Step 1 e la scheda Use Case racconta la stessa attività.

import { BLOCK2_INTERVIEW_GROUPS } from "@/config/block2Form";
import { Block2FieldValue, Step1Answer, Step1Submission, Step2Submission } from "./types";
import { candidateAttive } from "./frizioneScoring";
import {
  CARATTERISTICHE,
  DOMANDE,
  DOMANDA_CRITERI_TACITI,
  normalizeStep2Value,
} from "@/config/block1Frizione";
import { nowMs } from "./time";

export type TestScenario = {
  id: string;
  name: string;
  si: Record<number, { nome: string; impatto: number }>;
  criteriTaciti: boolean;
  step2Overrides?: Record<number, number>;
  useCase: Record<string, Block2FieldValue>;
};

export const TEST_SCENARIOS: TestScenario[] = [
  // 1. Amministrazione e Contabilità (Fatture passive)
  {
    id: "amministrazione",
    name: "Amministrazione — Registrazione fatture passive ERP",
    si: {
      1: { nome: "Registrazione fatture fornitori nell'ERP", impatto: 8.5 },
      6: { nome: "Riconciliazione ordini/bolle/fatture", impatto: 7.0 },
      11: { nome: "Preparazione documenti amministrativi ricorrenti", impatto: 6.5 },
      19: { nome: "Check di conformità sui documenti di gara", impatto: 5.0 },
    },
    criteriTaciti: true,
    step2Overrides: { 1: 6, 6: 8, 11: 8 },
    useCase: {
      problema:
        "Le fatture fornitore arrivano via email in PDF con layout diversi e vengono registrate a mano nell'ERP: due persone dell'amministrazione ricopiano intestazione, righe e centro di costo. Il ciclo di registrazione impiega in media 3 giorni, gli errori di imputazione vengono scoperti a fine mese e obbligano a note di credito e riaperture di periodo.",
      soluzione:
        "Un sistema che legge il PDF, estrae i campi (fornitore, numero, data, righe, IVA, centro di costo) e propone la registrazione precompilata nell'ERP, che l'addetto conferma o corregge. Le fatture riconosciute con confidenza alta passano in automatico, le altre restano in coda di verifica.",
      obiettivi: ["riduzioneTempi", "diminuzioneErrori", "liberareRisorse", "riduzioneCosti"],
      obiettiviAltro: "",
      datiNecessari:
        "PDF delle fatture degli ultimi 24 mesi, anagrafica fornitori, piano dei conti e centri di costo, storico delle registrazioni già validate come riferimento.",
      datiDove:
        "PDF nella casella condivisa dell'amministrazione e nel gestionale documentale; anagrafiche e registrazioni nell'ERP (SQL Server on premise, accessibile con viste dedicate).",
      datiVolume: "Circa 1.400 fatture al mese, 17.000 all'anno, con 6 righe medie per fattura.",
      datiQualita: "media",
      datiEtichettati: "parzialmente",
      impattoTipo: "diretto",
      beneficioPrimario: "tempo",
      stimaBeneficio:
        "Circa 2 ore al giorno di data entry risparmiate su 2 persone, stimate 900 ore/anno; ciclo di registrazione da 3 giorni a 1. Stima da confermare con un mese di misurazione.",
      utentiImpattati: "Circa 8 persone: 2 addetti alla registrazione, 4 responsabili di reparto, 2 in controllo di gestione",
      confidenzaStima: "media",
      frequenzaUso: "piuVolteGiorno",
      baseline:
        "Oggi: 3 giorni medi di attraversamento, circa il 6% di registrazioni corrette a posteriori, 2 FTE dedicati per metà del loro tempo.",
      metricaPrimaria:
        "Tempo medio di registrazione di una fattura da 3 giorni a 1 giorno entro il pilota, senza peggiorare la percentuale di errori (oggi 6%).",
      eticaDecisioni: "no",
      eticaCategorie: ["dipendenti"],
      eticaInformate: "si",
      eticaRevisione: "si",
      complessita: "media",
      datiSensibili:
        "No dati particolari: solo dati aziendali e di fornitori, con i nominativi dei referenti commerciali.",
      compliance: "Sì — GDPR per i dati dei referenti; conservazione sostitutiva a norma per i documenti fiscali.",
      dipendenze:
        "Dipende dal modulo di integrazione dell'ERP (upgrade previsto nel prossimo trimestre) e dalla casella email condivisa.",
      resistenze:
        "Gli addetti all'amministrazione, per timore che il controllo sulle registrazioni si sposti su di loro senza tempo per farlo; il responsabile IT per il carico di integrazione.",
      sostenitori:
        "Il controllo di gestione, che oggi aspetta la chiusura per avere i dati, e il responsabile amministrativo.",
      azioniResistenza:
        "Pilota su un solo fornitore ad alto volume con revisione umana sempre attiva, formazione di mezza giornata e obiettivo dichiarato di eliminare il data entry, non le persone.",
    },
  },

  // 2. Customer Service & Assistenza Clienti
  {
    id: "customer_service",
    name: "Customer Service — Triage e risposte ticket assistenza",
    si: {
      3: { nome: "Triage e categorizzazione urgenza ticket clienti", impatto: 8.5 },
      12: { nome: "Risposte a FAQ ricorrenti in più lingue", impatto: 7.5 },
      16: { nome: "Sintesi delle richieste tecniche per il reparto competente", impatto: 8.0 },
    },
    criteriTaciti: false,
    step2Overrides: { 3: 5, 16: 8, 12: 8 },
    useCase: {
      problema:
        "I clienti inviano richieste di supporto eterogenee via portale ed email. Gli operatori spendono oltre il 40% del tempo nella lettura preliminare, classificazione per urgenza e instradamento manuale verso i team tecnici di secondo livello.",
      soluzione:
        "Assistente AI integrato nel software di helpdesk che analizza il testo della richiesta, assegna categoria e priorità, rileva il sentiment del cliente e predispone una bozza di risposta con le soluzioni più frequenti.",
      obiettivi: ["riduzioneTempi", "qualitaServizio", "liberareRisorse"],
      obiettiviAltro: "",
      datiNecessari:
        "Storico di 40.000 ticket chiusi negli ultimi due anni con relative risposte, categorie assegnate e tempi di risoluzione; manuali tecnici di prodotto.",
      datiDove: "Piattaforma di ticketing Zendesk e Knowledge Base aziendale su Confluence.",
      datiVolume: "Circa 250 ticket al giorno in condizioni ordinarie, fino a 600/giorno nei picchi stagionali.",
      datiQualita: "alta",
      datiEtichettati: "si",
      impattoTipo: "diretto",
      beneficioPrimario: "tempo",
      stimaBeneficio:
        "Riduzione del 60% del tempo di prima risposta (First Response Time) e risoluzione automatica assistita per il 25% dei ticket di primo livello.",
      utentiImpattati: "12 operatori di Customer Care, 4 specialisti tecnici L2 e oltre 10.000 clienti attivi.",
      confidenzaStima: "alta",
      frequenzaUso: "piuVolteGiorno",
      baseline: "First Response Time medio attuale: 3.8 ore; tempo di categorizzazione manuale: 10 minuti a ticket.",
      metricaPrimaria:
        "Tempo di prima risposta inferiore a 25 minuti mantenendo il CSAT (indice soddisfazione cliente) sopra il 92%.",
      eticaDecisioni: "no",
      eticaCategorie: ["clienti"],
      eticaInformate: "si",
      eticaRevisione: "si",
      complessita: "media",
      datiSensibili: "Dati personali di contatto dei clienti e descrizioni di problematiche d'uso.",
      compliance: "GDPR per la protezione dei dati personali e policy di trasparenza sull'assistenza AI.",
      dipendenze: "Webhooks e connettori API bidirezionali con la piattaforma di ticketing Zendesk.",
      resistenze: "Timore degli operatori che le risposte automatiche risultino fredde o generiche.",
      sostenitori: "Head of Customer Experience e Direttore Commerciale.",
      azioniResistenza:
        "Modalità assistita obbligatoria: l'AI propone solo la bozza e l'operatore umano valida o modifica prima dell'invio finale.",
    },
  },

  // 3. Risorse Umane & Recruiting
  {
    id: "hr_recruiting",
    name: "Risorse Umane — Screening e matching curricula",
    si: {
      3: { nome: "Screening preliminare e ranking candidature ricevute", impatto: 8.0 },
      14: { nome: "Consultazione contratti integrativi e policy interne", impatto: 7.5 },
      16: { nome: "Sintesi note di debriefing e verbali di colloquio", impatto: 7.0 },
    },
    criteriTaciti: false,
    step2Overrides: { 3: 6, 14: 9, 16: 8 },
    useCase: {
      problema:
        "Per ogni selezione aperta arrivano centinaia di CV con formati eterogenei. I recruiter impiegano settimane nella lettura manuale preliminare per verificare requisiti di base e certificazioni, rallentando l'intero processo di inserimento.",
      soluzione:
        "Un motore di screening semantico che analizza i CV, estrae competenze, percorsi formativi ed esperienze pregresse, evidenziando il grado di corrispondenza con i requisiti del ruolo senza mai scartare automaticamente nessuno.",
      obiettivi: ["riduzioneTempi", "qualitaServizio", "capacitaAnalitiche"],
      obiettiviAltro: "",
      datiNecessari: "Job description formalizzate, mansionario aziendale e CV in formato PDF o Word.",
      datiDove: "Piattaforma ATS (Workday) e cartelle condivise su Google Drive HR.",
      datiVolume: "Circa 3.500 candidature all'anno distribuite su 30 posizioni aperte.",
      datiQualita: "media",
      datiEtichettati: "parzialmente",
      impattoTipo: "diretto",
      beneficioPrimario: "tempo",
      stimaBeneficio:
        "Dimezzamento del Time-to-Shortlist da 12 giorni lavorativi a 3 giorni, con recupero di circa 500 ore/anno di lavoro recruiter.",
      utentiImpattati: "4 recruiter del team Talent Acquisition e 15 hiring manager di reparto.",
      confidenzaStima: "media",
      frequenzaUso: "giornaliera",
      baseline: "Tempo medio di vaglio per 100 candidature: 14 ore di lavoro recruiter.",
      metricaPrimaria:
        "Presentazione della shortlist qualificata entro 4 giorni dalla chiusura annuncio con tasso di gradimento hiring manager >= 85%.",
      eticaDecisioni: "si",
      eticaCategorie: ["candidati"],
      eticaInformate: "si",
      eticaRevisione: "si",
      complessita: "alta",
      datiSensibili: "Dati personali e professionali dei candidati (anagrafica, formazione, esperienze).",
      compliance: "AI Act europeo (sistemi ad alto rischio HR), GDPR e rispetto rigoroso delle normative antidiscriminazione.",
      dipendenze: "API dell'ATS aziendale e modulo di anonimizzazione preventiva dei dati personali sensibili.",
      resistenze: "Preoccupazioni sull'affidabilità dell'algoritmo e timore di bias involontari nella selezione.",
      sostenitori: "Chief HR Officer e Responsabili di Business Unit in rapida crescita.",
      azioniResistenza:
        "Divieto categorico di scarto automatico, audit periodici di non discriminazione e supervisione umana obbligatoria su ogni passaggio.",
    },
  },

  // 4. Ufficio Acquisti & Procurement
  {
    id: "procurement",
    name: "Ufficio Acquisti — Tabulazione comparativa offerte fornitori",
    si: {
      2: { nome: "Estrazione listini e condizioni economiche da PDF", impatto: 8.5 },
      6: { nome: "Tabulazione comparativa offerte su gare d'acquisto", impatto: 9.0 },
      19: { nome: "Controllo documentale conformità DURC e certificazioni", impatto: 7.5 },
    },
    criteriTaciti: false,
    step2Overrides: { 6: 9, 2: 6, 19: 8 },
    useCase: {
      problema:
        "Il confronto delle offerte economiche per gare di fornitura richiede ore di allineamento manuale su fogli di calcolo per omogeneizzare voci di costo, sconti scaglionati, condizioni di trasporto e tempi di consegna da preventivi non strutturati.",
      soluzione:
        "Strumento di parsing e normalizzazione automatica dei preventivi fornitore che estrae le voci di capitolato, calcola il costo totale di possesso (TCO) e genera la matrice di confronto multidimensionale con evidenziazione di anomalie di prezzo.",
      obiettivi: ["riduzioneTempi", "diminuzioneErrori", "riduzioneCosti"],
      obiettiviAltro: "",
      datiNecessari: "Offerte e preventivi ricevuti in PDF/Excel, capitolati tecnici e storico acquisti degli ultimi 2 anni.",
      datiDove: "Portale fornitori e repository gare su SharePoint.",
      datiVolume: "Circa 500 gare d'acquisto e 1.800 preventivi gestiti all'anno.",
      datiQualita: "alta",
      datiEtichettati: "si",
      impattoTipo: "diretto",
      beneficioPrimario: "costi",
      stimaBeneficio:
        "Risparmio economico diretto stimato nell'1.5% sul volume acquisti grazie a negoziazioni più rapide e puntuali, più 750 ore/anno di data entry.",
      utentiImpattati: "6 buyer dell'ufficio acquisti e il Direttore Procurement.",
      confidenzaStima: "alta",
      frequenzaUso: "giornaliera",
      baseline: "Tempo medio di allineamento preventivi: 4.5 ore per procedura di gara.",
      metricaPrimaria:
        "Tabulazione comparativa pronta entro 15 minuti dal caricamento dei documenti di offerta.",
      eticaDecisioni: "no",
      eticaCategorie: ["fornitori"],
      eticaInformate: "si",
      eticaRevisione: "si",
      complessita: "media",
      datiSensibili: "Informazioni commerciali confidenziali, accordi quadro e condizioni di sconto riservate.",
      compliance: "Regole antitrust, riservatezza contrattuale (NDA) e policy trasparenza acquisti.",
      dipendenze: "Integrazione con il gestionale e-procurement aziendale.",
      resistenze: "Forte attaccamento dei buyer ai propri fogli Excel personalizzati.",
      sostenitori: "CPO (Chief Procurement Officer) e Direzione Amministrazione & Finanza.",
      azioniResistenza:
        "Co-progettazione delle schermate di confronto coinvolgendo due buyer senior per definire la visualizzazione ottimale.",
    },
  },

  // 5. Controllo di Gestione & FP&A
  {
    id: "controlling",
    name: "Controllo di Gestione — Commentari di bilancio e scostamenti",
    si: {
      5: { nome: "Monitoraggio scostamenti costi per centro di spesa", impatto: 7.5 },
      7: { nome: "Rilevamento tempestivo anomalie sui margini di commessa", impatto: 8.0 },
      8: { nome: "Generazione commentari e reportistica mensile di chiusura", impatto: 8.5 },
    },
    criteriTaciti: false,
    step2Overrides: { 8: 9, 7: 8, 5: 9 },
    useCase: {
      problema:
        "La stesura del fascicolo di commento alla chiusura mensile richiede giorni di raccolta dati ed estrazione manuale di tabelle, lasciando pochissimo tempo per l'analisi strategica delle cause alla base degli scostamenti rispetto al budget.",
      soluzione:
        "Generatore automatico di executive summary e narrazione testuale degli scostamenti alimentato direttamente dai dati certificati del data warehouse, con individuazione automatica delle voci anomale.",
      obiettivi: ["riduzioneTempi", "capacitaAnalitiche", "liberareRisorse"],
      obiettiviAltro: "",
      datiNecessari: "Partitari contabili di bilancio gestionale, budget annuale, forecast aggiornati e dati consuntivi mensili.",
      datiDove: "Data Warehouse su Snowflake e cruscotti direzionali Power BI.",
      datiVolume: "12 cicli mensili di reporting, 45 centri di costo, oltre 150 commesse attive.",
      datiQualita: "alta",
      datiEtichettati: "si",
      impattoTipo: "indiretto",
      beneficioPrimario: "qualita",
      stimaBeneficio:
        "Anticipo di 3 giorni nella consegna del fascicolo al Consiglio di Amministrazione e individuazione precoce delle commesse in deviazione di marginalità.",
      utentiImpattati: "4 controller, CFO e Comitato Direttivo.",
      confidenzaStima: "alta",
      frequenzaUso: "mensile",
      baseline: "Tempo medio di stesura del report di chiusura: 5.5 giorni lavorativi.",
      metricaPrimaria:
        "Consegna del commentario entro il giorno 3 lavorativo del mese successivo con accuratezza 100% dei dati numerici.",
      eticaDecisioni: "no",
      eticaCategorie: ["dipendenti"],
      eticaInformate: "si",
      eticaRevisione: "si",
      complessita: "media",
      datiSensibili: "Dati economico-finanziari strategici e margini industriali riservati.",
      compliance: "Principi contabili e policy aziendali sulla confidenzialità delle informazioni societarie.",
      dipendenze: "Viste SQL certificate e aggiornate sul Data Warehouse aziendale.",
      resistenze: "Assoluta necessità di evitare allucinazioni nei numeri all'interno del testo narrativo.",
      sostenitori: "CFO e Amministratore Delegato.",
      azioniResistenza:
        "Architettura rigida a template: le metriche numeriche sono collegate in modo deterministico e l'LLM cura esclusivamente la sintesi testuale controllata.",
    },
  },

  // 6. Manutenzione & Impianti Industriali
  {
    id: "manutenzione",
    name: "Manutenzione Impianti — Diagnosi predittiva e fermi macchina",
    si: {
      7: { nome: "Diagnosi precoce anomalie e predizione guasti cuscinetti", impatto: 9.5 },
      9: { nome: "Stima vita utile residua componenti soggetti a usura", impatto: 7.0 },
      15: { nome: "Trascrizione vocale report intervento manutentore", impatto: 6.0 },
    },
    criteriTaciti: true,
    step2Overrides: { 7: 8, 9: 7, 15: 7 },
    useCase: {
      problema:
        "I fermi linea improvvisi sulle macchine di confezionamento costano fino a 7.500€/ora. La manutenzione programmata a calendario non intercetta i guasti accidentali causati da anomalie meccaniche progressive.",
      soluzione:
        "Modello di intelligenza artificiale su serie temporali IoT (vibrazioni e temperature) che rileva pattern di deterioramento con 48 ore di anticipo rispetto al guasto, indicando al tecnico il componente da ispezionare.",
      obiettivi: ["riduzioneTempi", "diminuzioneErrori", "riduzioneCosti"],
      obiettiviAltro: "",
      datiNecessari: "Dati dei sensori telemetrici ad alta frequenza, storico ordini di lavoro e registro guasti dell'ultimo triennio.",
      datiDove: "Database serie temporali InfluxDB e server SCADA di stabilimento.",
      datiVolume: "Circa 1.5 TB di dati telemetrici da 16 macchine di confezionamento connesse.",
      datiQualita: "media",
      datiEtichettati: "parzialmente",
      impattoTipo: "diretto",
      beneficioPrimario: "costi",
      stimaBeneficio:
        "Riduzione del 30% dei tempi di fermo non programmato, corrispondente a un risparmio di oltre 110.000€ all'anno.",
      utentiImpattati: "8 tecnici manutentori, 2 capi turno e il Responsabile di Manutenzione.",
      confidenzaStima: "media",
      frequenzaUso: "continuo",
      baseline: "40 ore all'anno di fermo macchina imprevisto per linea di produzione.",
      metricaPrimaria:
        "Aumento dell'intervallo medio tra guasti (MTBF) del 20% con preavviso medio degli alert superiore a 36 ore.",
      eticaDecisioni: "no",
      eticaCategorie: ["dipendenti"],
      eticaInformate: "si",
      eticaRevisione: "si",
      complessita: "alta",
      datiSensibili: "Parametri industriali e telemetria operativa di impianto.",
      compliance: "Direttiva Macchine e normative sulla salute e sicurezza nei luoghi di lavoro.",
      dipendenze: "Stabilità dell'infrastruttura di rete industriale IoT e calibrazione periodica dei sensori.",
      resistenze: "Scetticismo iniziale dei manutentori esperti abituati a intervenire sulla base dell'esperienza visiva e uditiva.",
      sostenitori: "Plant Manager e Direttore di Produzione.",
      azioniResistenza:
        "Coinvolgimento dei manutentori senior nella taratura delle soglie di allarme e nella formulazione delle spiegazioni tecniche fornite dal sistema.",
    },
  },

  // 7. Ufficio Legale & Affari Societari
  {
    id: "legale",
    name: "Ufficio Legale — Revisione comparativa contratti e NDA",
    si: {
      11: { nome: "Revisione clausole di limitazione responsabilità e penali", impatto: 8.0 },
      12: { nome: "Adattamento di contratti standard per destinatari diversi", impatto: 9.0 },
      14: { nome: "Consultazione repository sentenze e pareri interni pregressi", impatto: 7.5 },
    },
    criteriTaciti: false,
    step2Overrides: { 12: 9, 11: 9, 14: 8 },
    useCase: {
      problema:
        "La verifica e negoziazione dei contratti standard (accordi di riservatezza, forniture, lettere d'intenti) impegna l'80% del tempo dei legali interni, rallentando la firma degli accordi commerciali.",
      soluzione:
        "Legal Copilot che effettua la comparazione automatica del contratto con le policy aziendali (fallback clauses), evidenzia le clausole critiche o difformi e propone formulazioni alternative conformi.",
      obiettivi: ["riduzioneTempi", "diminuzioneErrori", "qualitaServizio"],
      obiettiviAltro: "",
      datiNecessari: "Policy contrattuali societarie, clausole standard approvate e archivio storico di 1.200 contratti siglati.",
      datiDove: "Documentale legale protetto su SharePoint con crittografia dedicata.",
      datiVolume: "Circa 750 contratti e accordi di riservatezza analizzati ogni anno.",
      datiQualita: "alta",
      datiEtichettati: "si",
      impattoTipo: "diretto",
      beneficioPrimario: "tempo",
      stimaBeneficio:
        "Abbattimento del tempo medio di revisione dei contratti standard da 6 giorni a 24 ore lavorative.",
      utentiImpattati: "3 giuristi d'impresa interni, 12 commerciali e 4 addetti agli acquisti.",
      confidenzaStima: "alta",
      frequenzaUso: "piuVolteGiorno",
      baseline: "Tempo medio di revisione manuale: 3.2 ore per singolo contratto standard.",
      metricaPrimaria:
        "Turnaround time inferiore a 24 ore con zero clausole non conformi approvate per svista.",
      eticaDecisioni: "no",
      eticaCategorie: ["clienti", "fornitori"],
      eticaInformate: "si",
      eticaRevisione: "si",
      complessita: "media",
      datiSensibili: "Accordi economici confidenziali, patti di non concorrenza e segreti commerciali.",
      compliance: "GDPR, segreto professionale e requisiti di sovranità del dato in cloud sicuro.",
      dipendenze: "Integrazione tramite add-in per Microsoft Word ed endpoint LLM dedicato con garanzia contrattuale di non addestramento.",
      resistenze: "Responsabilità legale formale che deve rimanere interamente nelle mani del professionista.",
      sostenitori: "General Counsel e Direttore Commerciale.",
      azioniResistenza:
        "Il tool lavora esclusivamente in modalità revisione tracciata suggerita: la decisione di accettare o modificare le clausole rimane sempre dell'avvocato.",
    },
  },

  // 8. Logistica & Spedizioni
  {
    id: "logistica",
    name: "Logistica — Controllo bolle DDT e carico merci in banchina",
    si: {
      1: { nome: "Aggiornamento stati di consegna e codici tracking su portale", impatto: 7.5 },
      6: { nome: "Controllo corrispondenza DDT, packing list e ordini spedizione", impatto: 8.0 },
      20: { nome: "Scelta del corriere secondo peso, volume e tratta", impatto: 7.0 },
    },
    criteriTaciti: false,
    step2Overrides: { 6: 8, 1: 5, 20: 8 },
    useCase: {
      problema:
        "La verifica documentale dei documenti di trasporto (DDT) all'arrivo delle merci in banchina genera colli di bottiglia e lunghe attese per i trasportatori, con frequenti discrepanze riscontrate solo dopo lo scarico.",
      soluzione:
        "Applicazione mobile per tablet con fotocamera OCR che inquadra il DDT cartaceo e i codici a barre, effettuando la riconciliazione automatica con l'ordine d'acquisto a sistema e sbloccando subito la banchina.",
      obiettivi: ["riduzioneTempi", "diminuzioneErrori", "qualitaServizio"],
      obiettiviAltro: "",
      datiNecessari: "Ordini di acquisto aperti nel WMS (Warehouse Management System) e scansioni di bolle di trasporto.",
      datiDove: "Database WMS locale collegato con i terminali industriali di magazzino.",
      datiVolume: "Circa 160 arrivi merci al giorno distribuiti su 4 baie di carico.",
      datiQualita: "alta",
      datiEtichettati: "si",
      impattoTipo: "diretto",
      beneficioPrimario: "tempo",
      stimaBeneficio:
        "Azzeramento dei tempi di attesa camion in banchina e riduzione dell'85% delle discrepanze inventariali all'ingresso merci.",
      utentiImpattati: "10 addetti di magazzino e 2 responsabili della logistica di stabilimento.",
      confidenzaStima: "alta",
      frequenzaUso: "continuo",
      baseline: "Tempo medio di accettazione e controllo merci: 20 minuti per fornitore.",
      metricaPrimaria:
        "Accettazione e controllo completati entro 5 minuti per veicolo.",
      eticaDecisioni: "no",
      eticaCategorie: ["dipendenti"],
      eticaInformate: "si",
      eticaRevisione: "si",
      complessita: "bassa",
      datiSensibili: "Nessun dato personale particolare: solo anagrafiche fornitore, codici articolo e quantità.",
      compliance: "Tracciabilità di lotto secondo le certificazioni ISO 9001 e ISO 22000.",
      dipendenze: "Copertura Wi-Fi industriale ad alta affidabilità su tutte le aree di banchina.",
      resistenze: "Difficoltà d'uso dei dispositivi touch da parte del personale operativo con dispositivi di protezione individuale.",
      sostenitori: "Supply Chain Manager e Direttore Operativo.",
      azioniResistenza:
        "Adozione di tablet rugged con interfaccia a pulsanti grandi ad alto contrasto e workflow a 3 tocchi.",
    },
  },

  // 9. Marketing & Comunicazione
  {
    id: "marketing",
    name: "Marketing — Localizzazione e generazione contenuti multicanale",
    si: {
      12: { nome: "Localizzazione e traduzione schede prodotto per mercati esteri", impatto: 7.5 },
      11: { nome: "Redazione newsletter e post social secondo il brand tone", impatto: 8.0 },
      16: { nome: "Sintesi da report di settore per articoli divulgativi sul blog", impatto: 6.5 },
    },
    criteriTaciti: false,
    step2Overrides: { 11: 9, 12: 8, 16: 8 },
    useCase: {
      problema:
        "Il lancio periodico di nuovi prodotti richiede la redazione di decine di varianti di testo per canali differenti (social media, newsletter, schede ecommerce, comunicati stampa) in italiano, inglese, tedesco e francese.",
      soluzione:
        "Piattaforma di Content Creation assistita addestrata sulle Brand Guidelines e sui cataloghi di prodotto che genera le bozze multicanale e multilingua pronte per la revisione finale del copywriter.",
      obiettivi: ["riduzioneTempi", "personalizzazione", "liberareRisorse"],
      obiettiviAltro: "",
      datiNecessari: "Linee guida di tono di voce del brand, glossario terminologico aziendale e schede tecniche di prodotto.",
      datiDove: "Digital Asset Management (DAM) e PIM aziendale.",
      datiVolume: "Circa 100 lanci di campagna all'anno e oltre 400 schede di prodotto aggiornate.",
      datiQualita: "alta",
      datiEtichettati: "si",
      impattoTipo: "diretto",
      beneficioPrimario: "tempo",
      stimaBeneficio:
        "Riduzione del 65% dei tempi di redazione delle prime bozze e incremento del 300% della copertura editoriale sui mercati esteri.",
      utentiImpattati: "4 copywriter interni e 2 social media specialist.",
      confidenzaStima: "alta",
      frequenzaUso: "giornaliera",
      baseline: "Tempo medio di declinazione completa di una campagna: 10 ore lavorative.",
      metricaPrimaria:
        "Bozza completa multicanale disponibile entro 45 minuti dal caricamento della scheda prodotto.",
      eticaDecisioni: "no",
      eticaCategorie: ["clienti"],
      eticaInformate: "si",
      eticaRevisione: "si",
      complessita: "bassa",
      datiSensibili: "Testi promozionali e materiale di prodotto coperti da embargo prima del lancio.",
      compliance: "Codice di autodisciplina pubblicitaria e trasparenza comunicativa verso il pubblico.",
      dipendenze: "Connettori con il CMS aziendale (WordPress/HubSpot) e il catalogo prodotti.",
      resistenze: "Timore che i testi generati risultino privi di originalità o piatti nello stile comunicativo.",
      sostenitori: "CMO (Chief Marketing Officer) e Head of Digital Marketing.",
      azioniResistenza:
        "Messa a punto di prompt specifici sul tono di voce storico del brand e mantenimento della revisione umana per ogni pubblicazione.",
    },
  },

  // 10. Qualità & Certificazioni
  {
    id: "qualita",
    name: "Qualità — Report non conformità 8D e cause radice",
    si: {
      8: { nome: "Reportistica mensile KPI di scarto e resa qualitativa", impatto: 7.0 },
      15: { nome: "Raccolta dati e redazione report di analisi causa radice 8D", impatto: 8.0 },
      19: { nome: "Checklist di conformità audit ISO 9001 e IATF 16949", impatto: 8.5 },
    },
    criteriTaciti: false,
    step2Overrides: { 19: 9, 15: 8, 8: 8 },
    useCase: {
      problema:
        "A fronte di una non conformità o reclamo cliente, la redazione della scheda 8D richiede 4-5 giorni di ricerche incrociate tra reparti per recuperare lotti di materia prima, parametri di processo e schede di collaudo.",
      soluzione:
        "Assistente per l'Assicurazione Qualità che correla in automatico i registri di collaudo, produzione e fornitura del lotto coinvolto, generando la prima bozza del report 8D con il diagramma Ishikawa preliminare.",
      obiettivi: ["riduzioneTempi", "diminuzioneErrori", "qualitaServizio"],
      obiettiviAltro: "",
      datiNecessari: "Registri delle non conformità, dati di collaudo fine linea, storico azioni correttive (CAPA) e tracciabilità di lotto.",
      datiDove: "Software QMS aziendale e database di collaudo SQL Server.",
      datiVolume: "Circa 300 non conformità interne e 70 reclami cliente gestiti all'anno.",
      datiQualita: "alta",
      datiEtichettati: "si",
      impattoTipo: "diretto",
      beneficioPrimario: "tempo",
      stimaBeneficio:
        "Riduzione del tempo di risposta ai clienti da 6 giorni lavorativi a 24 ore, migliorando sensibilmente il vendor rating aziendale.",
      utentiImpattati: "3 quality engineer e 5 auditor interni di stabilimento.",
      confidenzaStima: "alta",
      frequenzaUso: "giornaliera",
      baseline: "Tempo medio di compilazione del report 8D preliminare: 4.8 giorni.",
      metricaPrimaria:
        "Report 8D preliminare emesso entro 24 ore dalla notifica di reclamo.",
      eticaDecisioni: "no",
      eticaCategorie: ["clienti"],
      eticaInformate: "si",
      eticaRevisione: "si",
      complessita: "media",
      datiSensibili: "Dati industriali su tolleranze e difettosità di processo.",
      compliance: "Standard di certificazione ISO 9001:2015 e IATF 16949 per il settore automotive.",
      dipendenze: "Collegamento diretto tra il software QMS e i database di collaudo fine linea.",
      resistenze: "Abitudine del personale a redigere le relazioni su file Word non strutturati.",
      sostenitori: "Quality Director e Vice President Operations.",
      azioniResistenza:
        "Integrazione diretta nel flusso di lavoro già noto con schede precompilate pronte per l'approvazione del responsabile qualità.",
    },
  },
];

export const TEST_USE_CASE_OPTIONS: Record<string, Block2FieldValue>[] = TEST_SCENARIOS.map(
  (s) => s.useCase
);

/** Restituisce un Use Case di esempio casuale tra le opzioni disponibili. */
export function getRandomTestUseCase(): Record<string, Block2FieldValue> {
  const index = Math.floor(Math.random() * TEST_SCENARIOS.length);
  return TEST_SCENARIOS[index].useCase;
}

/** Restituisce uno scenario completo casuale tra quelli disponibili. */
export function getRandomTestScenario(): TestScenario {
  const index = Math.floor(Math.random() * TEST_SCENARIOS.length);
  return TEST_SCENARIOS[index];
}

/** Step 1 di esempio: genera risposte coerenti a partire da uno scenario (scelto casualmente se non specificato). */
export function testStep1Submission(scenarioIndex?: number): Step1Submission {
  const idx =
    typeof scenarioIndex === "number" && scenarioIndex >= 0 && scenarioIndex < TEST_SCENARIOS.length
      ? scenarioIndex
      : Math.floor(Math.random() * TEST_SCENARIOS.length);
  const scenario = TEST_SCENARIOS[idx];

  const risposte: Record<string, Step1Answer> = {};
  for (const domanda of DOMANDE) {
    const si = scenario.si[domanda.id];
    if (si) {
      risposte[String(domanda.id)] = { risposta: "si", nome: si.nome, impatto: si.impatto };
      continue;
    }
    risposte[String(domanda.id)] =
      domanda.id === DOMANDA_CRITERI_TACITI && scenario.criteriTaciti
        ? { risposta: "si" }
        : { risposta: "no" };
  }
  return { risposte, criteriTaciti: scenario.criteriTaciti, updatedAt: nowMs() };
}

/**
 * Step 2 di esempio: calcola i valori per le candidate dello Step 1 in base
 * al tipo di caratteristica (o agli override dello scenario).
 */
export function testStep2Submission(
  step1: Step1Submission,
  scenarioIndex?: number
): Step2Submission {
  const scenario =
    typeof scenarioIndex === "number" && scenarioIndex >= 0 && scenarioIndex < TEST_SCENARIOS.length
      ? TEST_SCENARIOS[scenarioIndex]
      : undefined;

  const valori: Record<string, number> = {};
  for (const candidata of candidateAttive(step1)) {
    const override = scenario?.step2Overrides?.[candidata.domandaId];
    if (typeof override === "number") {
      valori[String(candidata.domandaId)] = normalizeStep2Value(override);
    } else {
      const generated = CARATTERISTICHE[candidata.blocco].tipo === "campana" ? 6 : 9;
      valori[String(candidata.domandaId)] = normalizeStep2Value(generated);
    }
  }
  return { valori, updatedAt: nowMs() };
}

/** Scheda Use Case di default (compatibilità all'indietro). */
export const TEST_USE_CASE_VALUES: Record<string, Block2FieldValue> = TEST_SCENARIOS[0].useCase;

/** Tutti gli argomenti dell'intervista: la scheda di test parte già completa. */
export const TEST_CLOSED_GROUPS: string[] = BLOCK2_INTERVIEW_GROUPS.map((g) => g.key);
