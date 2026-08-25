// Esportazione Excel della dashboard del facilitatore: i dati realmente
// raccolti nella sessione (non uno screenshot della pagina), organizzati in
// colonne. Vive qui, separato dal componente, sullo stesso principio degli
// altri export (vedi useCasePdf.ts): la logica di formattazione è riusabile e
// testabile senza il DOM.

import {
  BLOCK2_FIELDS,
  block2ValueLabel,
  isBlock2ValueFilled,
} from "@/config/block2Form";
import { DOMANDE } from "@/config/block1Frizione";
import { calcolaEsiti } from "./frizioneScoring";
import { Participant, Submission } from "./types";

export type DashboardExportRow = { participant: Participant; submission: Submission };

function fileName(code: string): string {
  return `workshop-ai-adoption-${code}.xlsx`;
}

/** Una riga per partecipante: stato di ogni step, e la raccomandazione dello Step 3 a confronto con la scelta. */
function panoramicaRiga({ participant, submission }: DashboardExportRow) {
  const esiti = calcolaEsiti(submission.step1, submission.step2);
  const migliore = esiti[0];
  const step3 = submission.step3;

  const risposteDate = Object.values(submission.step1?.risposte ?? {}).filter((r) => r?.risposta).length;
  const siDichiarati = Object.values(submission.step1?.risposte ?? {}).filter(
    (r) => r?.risposta === "si"
  ).length;
  const useCaseFilled = Object.values(submission.block2?.values ?? {}).filter((v) =>
    Array.isArray(v) ? v.length > 0 : Boolean(v && v.trim())
  ).length;

  return {
    Partecipante: participant.name,
    "Step 1 — stato": submission.step1?.completedAt
      ? `Completato (${siDichiarati} sì)`
      : risposteDate > 0
        ? `${risposteDate}/${DOMANDE.length} risposte`
        : "—",
    "Step 2 — stato": submission.step2?.completedAt
      ? "Completato"
      : Object.keys(submission.step2?.valori ?? {}).length > 0
        ? "In corso"
        : "—",
    "Step 3 — opzione con punteggio più alto": migliore?.nome ?? "—",
    "Step 3 — punteggio più alto": typeof migliore?.punteggio === "number" ? Math.round(migliore.punteggio) : "",
    "Step 3 — scelta del partecipante": step3?.chosenNome ?? "—",
    "Step 3 — punteggio della scelta":
      typeof step3?.chosenPunteggio === "number" ? Math.round(step3.chosenPunteggio) : "",
    "Step 3 — ha seguito la raccomandazione": step3?.chosenDomandaId
      ? step3.followedRecommendation
        ? "Sì"
        : "No, confermato consapevolmente"
      : "—",
    "Use Case — stato": submission.block2?.completedAt
      ? "Confermata"
      : useCaseFilled > 0
        ? `Bozza (${useCaseFilled}/${BLOCK2_FIELDS.length} campi)`
        : "—",
  };
}

/** Una riga per partecipante con tutti i campi della scheda Use Case, una colonna per campo. */
function useCaseRiga({ participant, submission }: DashboardExportRow) {
  const values = submission.block2?.values ?? {};
  const riga: Record<string, string> = { Partecipante: participant.name };
  for (const field of BLOCK2_FIELDS) {
    const value = values[field.id];
    riga[field.label] = isBlock2ValueFilled(value) ? block2ValueLabel(field, value) : "";
  }
  return riga;
}

/** Una riga per partecipante con le risposte sì/no e l'impatto della scheda di attrito. */
function attritoRiga({ participant, submission }: DashboardExportRow) {
  const risposte = submission.step1?.risposte ?? {};
  const riga: Record<string, string | number> = { Partecipante: participant.name };
  for (const domanda of DOMANDE) {
    const answer = risposte[String(domanda.id)];
    riga[`D${domanda.id}`] =
      answer?.risposta === "si" ? (typeof answer.impatto === "number" ? answer.impatto : "sì") : answer?.risposta === "no" ? "no" : "";
  }
  return riga;
}

export async function downloadDashboardExcel(code: string, rows: DashboardExportRow[]): Promise<void> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.map(panoramicaRiga)), "Panoramica");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.map(useCaseRiga)), "Use Case");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.map(attritoRiga)), "Scheda di attrito");

  XLSX.writeFile(wb, fileName(code));
}
