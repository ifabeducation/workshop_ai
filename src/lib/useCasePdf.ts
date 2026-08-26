// Esportazione PDF della scheda Use Case, condivisa fra partecipante (piede
// della scheda) e facilitatore (dashboard). Il PDF si compone con le primitive
// testuali di jsPDF invece di fotografare il DOM: la scheda è lunga, va su più
// pagine e il testo deve restare selezionabile e cercabile. Per lo stesso
// motivo non serve che la pagina sia visibile: il facilitatore la scarica
// partendo dai soli valori salvati.

import {
  BLOCK2_SECTIONS,
  block2ValueLabel,
  isBlock2ValueFilled,
} from "@/config/block2Form";
import { Block2FieldValue, ChatMessage, Step3Decision } from "./types";

const MARGIN = 48;
const LINE = 14;

export type UseCasePdfInput = {
  participantName: string;
  code: string;
  values: Record<string, Block2FieldValue>;
  chatLog?: ChatMessage[];
  decision?: Step3Decision;
  candidates?: Array<{
    nome: string;
    punteggio: number;
    impatto: number;
    prontezza: number;
  }>;
  /** Momento dell'esportazione, in millisecondi. */
  now: number;
};

function fileName(participantName: string): string {
  const slug = participantName.trim().replace(/\s+/g, "_").replace(/[^\w-]/g, "") || "partecipante";
  return `use-case-${slug}.pdf`;
}

export async function downloadUseCasePdf({
  participantName,
  code,
  values,
  chatLog = [],
  decision,
  candidates = [],
  now,
}: UseCasePdfInput): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGIN * 2;
  let y = MARGIN;

  /** Salta pagina quando lo spazio residuo non basta per il blocco successivo. */
  function ensureSpace(needed: number) {
    if (y + needed <= pageHeight - MARGIN) return;
    pdf.addPage();
    y = MARGIN;
  }

  function write(text: string, options: { size: number; style: "normal" | "bold"; gap?: number }) {
    pdf.setFont("helvetica", options.style);
    pdf.setFontSize(options.size);
    const lines = pdf.splitTextToSize(text, contentWidth) as string[];
    const lineHeight = options.size + 3;
    for (const line of lines) {
      ensureSpace(lineHeight);
      pdf.text(line, MARGIN, y);
      y += lineHeight;
    }
    y += options.gap ?? 0;
  }

  write("Workshop AI Adoption — IFAB Foundation", { size: 9, style: "normal" });
  write("Use Case Submission", { size: 18, style: "bold", gap: 2 });
  write(
    `${participantName} · sessione ${code} · ${new Date(now).toLocaleString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}`,
    { size: 9, style: "normal", gap: 10 }
  );

  ensureSpace(LINE * 4);
  pdf.setDrawColor(200);
  pdf.line(MARGIN, y - 6, pageWidth - MARGIN, y - 6);
  write("Decisione dello Step 3", { size: 12, style: "bold", gap: 3 });
  if (decision) {
    write(
      `Opzione con valore più alto: ${decision.recommended.nome} (${decision.recommended.punteggio.toFixed(1)}/100)`,
      { size: 10, style: "normal", gap: 2 }
    );
    write(
      `Scelta del partecipante: ${decision.selected.nome} (${decision.selected.punteggio.toFixed(1)}/100)`,
      { size: 10, style: "bold", gap: 2 }
    );
    write(
      decision.selected.domandaId === decision.recommended.domandaId
        ? "Il partecipante ha seguito la raccomandazione del sistema."
        : `Il partecipante ha scelto un'opzione diversa${
            decision.nonOptimalConfirmed ? " e ha confermato di voler procedere" : ""
          }.`,
      { size: 9, style: "normal", gap: 6 }
    );
  } else {
    write("Scelta del partecipante non ancora registrata.", { size: 10, style: "normal", gap: 6 });
  }

  if (candidates.length > 0) {
    write("Tre opzioni valutate", { size: 9, style: "bold", gap: 2 });
    for (const candidate of candidates) {
      write(
        `${candidate.nome}: ${candidate.punteggio.toFixed(1)}/100 · impatto ${candidate.impatto.toFixed(1)}/10 · prontezza ${candidate.prontezza.toFixed(1)}/10`,
        { size: 9, style: "normal", gap: 2 }
      );
    }
    y += 6;
  }

  if (chatLog.length > 0) {
    ensureSpace(LINE * 4);
    pdf.setDrawColor(200);
    pdf.line(MARGIN, y - 6, pageWidth - MARGIN, y - 6);
    write("Conversazione completa dello Step 4", { size: 12, style: "bold", gap: 3 });
    for (const message of chatLog) {
      write(message.role === "user" ? "Partecipante" : "Assistente AI", {
        size: 8.5,
        style: "bold",
      });
      write(message.content, { size: 9.5, style: "normal", gap: 6 });
    }
    y += 4;
  }

  for (const section of BLOCK2_SECTIONS) {
    // Il titolo di sezione non deve restare orfano in fondo alla pagina.
    ensureSpace(LINE * 3);
    pdf.setDrawColor(200);
    pdf.line(MARGIN, y - 6, pageWidth - MARGIN, y - 6);
    write(`${section.number} ${section.title}`, { size: 12, style: "bold", gap: 2 });

    for (const field of section.fields) {
      const value = values[field.id];
      write(field.label, { size: 8.5, style: "bold" });
      write(
        isBlock2ValueFilled(value)
          ? block2ValueLabel(field, value)
          : "Informazione non disponibile / non conosciuta dal partecipante",
        {
        size: 10,
        style: "normal",
        gap: 6,
        }
      );
    }

    y += 6;
  }

  pdf.save(fileName(participantName));
}
