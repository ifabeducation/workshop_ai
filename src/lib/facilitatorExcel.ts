import { BLOCCHI, domandaById } from "@/config/block1Frizione";
import { BLOCK2_FIELDS, block2ValueLabel } from "@/config/block2Form";
import { calcolaEsiti, etichettaCaratteristica } from "@/lib/frizioneScoring";
import type { Participant, Submission } from "@/lib/types";

type AggregateRow = { participant: Participant; submission: Submission };
type CellValue = string | number | boolean;
type ExportRow = Record<string, CellValue>;

function safeCell(value: CellValue | null | undefined): CellValue {
  if (value === null || value === undefined) return "";
  if (typeof value !== "string") return value;
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function row(values: Record<string, CellValue | null | undefined>): ExportRow {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, safeCell(value)]));
}

function summaryRows(rows: AggregateRow[]): ExportRow[] {
  return rows.map(({ participant, submission }) => {
    const esiti = calcolaEsiti(submission.step1, submission.step2);
    const decision = submission.step2?.step3Decision;
    const useCase = Object.fromEntries(
      BLOCK2_FIELDS.map((field) => [
        `Use Case · ${field.label}`,
        block2ValueLabel(field, submission.block2?.values?.[field.id]) || "",
      ])
    );

    return row({
      Partecipante: participant.name,
      "Ingresso sessione": new Date(participant.joinedAt).toLocaleString("it-IT"),
      "Step 1 completato": Boolean(submission.step1?.completedAt),
      "Step 2 completato": Boolean(submission.step2?.completedAt),
      "Opzione con valore più alto": decision?.recommended.nome ?? esiti[0]?.nome ?? "",
      "Punteggio opzione più alta": decision?.recommended.punteggio ?? esiti[0]?.punteggio ?? "",
      "Scelta del partecipante": decision?.selected.nome ?? "",
      "Punteggio scelta partecipante": decision?.selected.punteggio ?? "",
      "Ha seguito la raccomandazione": decision
        ? decision.selected.domandaId === decision.recommended.domandaId
          ? "Sì"
          : "No"
        : "",
      "Scelta alternativa confermata": decision?.nonOptimalConfirmed ?? "",
      "Use Case confermato": Boolean(submission.block2?.completedAt),
      ...useCase,
    });
  });
}

function step1Rows(rows: AggregateRow[]): ExportRow[] {
  return rows.flatMap(({ participant, submission }) =>
    Object.entries(submission.step1?.risposte ?? {}).map(([id, answer]) => {
      const question = domandaById(Number(id));
      return row({
        Partecipante: participant.name,
        "ID domanda": Number(id),
        Domanda: question?.testo ?? `Domanda storica ${id}`,
        Area: question ? BLOCCHI[question.blocco].label : "",
        Risposta: answer.risposta === "si" ? "Sì" : "No",
        Impatto: answer.impatto ?? "",
        "Attività indicata": answer.nome ?? "",
      });
    })
  );
}

function candidateRows(rows: AggregateRow[]): ExportRow[] {
  return rows.flatMap(({ participant, submission }) => {
    const decision = submission.step2?.step3Decision;
    return calcolaEsiti(submission.step1, submission.step2).map((candidate, index) =>
      row({
        Partecipante: participant.name,
        Posizione: index + 1,
        Candidata: candidate.nome,
        Area: BLOCCHI[candidate.blocco].label,
        Caratteristica: etichettaCaratteristica(candidate.blocco),
        "Valore caratteristica": candidate.valore,
        Impatto: candidate.impatto,
        Prontezza: candidate.prontezza,
        Punteggio: candidate.punteggio,
        "Raccomandata dal sistema": decision
          ? decision.recommended.domandaId === candidate.domandaId
          : index === 0,
        "Scelta dal partecipante": decision?.selected.domandaId === candidate.domandaId,
      })
    );
  });
}

function conversationRows(rows: AggregateRow[]): ExportRow[] {
  return rows.flatMap(({ participant, submission }) =>
    (submission.block2?.chatLog ?? []).map((message, index) =>
      row({
        Partecipante: participant.name,
        Turno: index + 1,
        Ruolo: message.role === "user" ? "Partecipante" : "Assistente AI",
        Messaggio: message.content,
      })
    )
  );
}

export async function downloadFacilitatorExcel(code: string, rows: AggregateRow[]): Promise<void> {
  const { default: writeExcelFile } = await import("write-excel-file/browser");

  const sheets: Array<[string, ExportRow[]]> = [
    ["Riepilogo", summaryRows(rows)],
    ["Risposte Step 1", step1Rows(rows)],
    ["Candidate e Step 3", candidateRows(rows)],
    ["Conversazioni Step 4", conversationRows(rows)],
  ];

  const workbookSheets = sheets.map(([name, data]) => {
    const headers = data.length > 0 ? Object.keys(data[0]) : ["Nessun dato disponibile"];
    return {
      sheet: name,
      stickyRowsCount: 1,
      columns: headers.map((header) => ({ width: Math.min(60, Math.max(16, header.length + 3)) })),
      data: [
        headers.map((header) => ({
          value: header,
          fontWeight: "bold" as const,
          textColor: "#FFFFFF",
          backgroundColor: "#203A57",
          wrap: true,
        })),
        ...data.map((item) =>
          headers.map((header) => ({ value: item[header], alignVertical: "top" as const, wrap: true }))
        ),
      ],
    };
  });

  await writeExcelFile(workbookSheets, {
    fontFamily: "Arial",
    fontSize: 10,
  }).toFile(`workshop-ai-sessione-${code}.xlsx`);
}
