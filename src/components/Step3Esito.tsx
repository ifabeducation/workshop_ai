"use client";

import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileDown, Star } from "lucide-react";
import { Step1Submission, Step2Submission, Step3Decision } from "@/lib/types";
import { calcolaEsiti, etichettaCaratteristica } from "@/lib/frizioneScoring";
import { submitStep2 } from "@/lib/clientApi";
import { nowMs } from "@/lib/time";
import MatriceImpattoProntezza from "./MatriceImpattoProntezza";

/** Un decimale solo quando serve: la barra ora è a scala decimale. */
function arrotonda(v: number): string {
  return v % 1 === 0 ? String(v) : v.toFixed(1);
}

/**
 * Step 3 — esito. Tutto è calcolato da step1 + step2 (nessun dato proprio):
 * matrice Impatto × Prontezza e una scheda per candidata, in ordine di
 * punteggio. È il primo punto del percorso in cui compaiono numeri.
 */
export default function Step3Esito({
  participantName,
  code,
  participantId,
  step1,
  step2,
  onSaved,
  onProceed,
}: {
  participantName: string;
  code: string;
  participantId: string;
  step1?: Step1Submission;
  step2?: Step2Submission;
  onSaved: (data: Step2Submission) => void;
  onProceed: () => void;
}) {
  const printRef = useRef<HTMLDivElement>(null);
  const [savingChoice, setSavingChoice] = useState(false);
  const esiti = calcolaEsiti(step1, step2);
  const criteriTaciti = Boolean(step1?.criteriTaciti);
  const selectedId = step2?.step3Decision?.selected.domandaId;

  async function selectCandidate(domandaId: number) {
    const recommended = esiti[0];
    const selected = esiti.find((candidate) => candidate.domandaId === domandaId);
    if (!recommended || !selected) return;

    const decision: Step3Decision = {
      recommended: {
        domandaId: recommended.domandaId,
        nome: recommended.nome,
        punteggio: recommended.punteggio,
      },
      selected: {
        domandaId: selected.domandaId,
        nome: selected.nome,
        punteggio: selected.punteggio,
      },
      nonOptimalConfirmed: false,
      selectedAt: nowMs(),
    };

    setSavingChoice(true);
    try {
      await submitStep2(code, participantId, { step3Decision: decision });
      onSaved({ step3Decision: decision });
    } finally {
      setSavingChoice(false);
    }
  }

  async function handleExportPdf() {
    if (!printRef.current) return;
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import("jspdf"),
      import("html2canvas"),
    ]);
    const canvas = await html2canvas(printRef.current, { backgroundColor: "#ffffff", scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const imgWidth = pageWidth - 48;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.text(`Workshop AI Adoption — ${participantName}`, 24, 28);
    pdf.addImage(imgData, "PNG", 24, 40, imgWidth, imgHeight);
    pdf.save(`workshop-ai-adoption-${participantName.replace(/\s+/g, "_")}.pdf`);
  }

  if (esiti.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-ifab-border bg-white p-8 text-center text-sm text-ifab-text-muted">
        L&apos;esito compare quando hai concluso lo Step 2 rispondendo per tutte le attività candidate.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="mb-1 text-lg font-semibold text-ifab-navy">Step 3 · Esito</h2>
          <p className="text-sm text-ifab-text-muted">
            Confronta le tre candidate e scegli liberamente quella da sviluppare nello Step 4.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExportPdf}
          className="flex items-center gap-2 rounded-lg border border-ifab-navy px-4 py-2 text-sm font-semibold text-ifab-navy transition hover:bg-ifab-navy hover:text-white"
        >
          <FileDown size={16} /> Esporta PDF
        </button>
      </div>

      <div ref={printRef} className="flex flex-col gap-4">
        <section className="rounded-xl border border-ifab-border bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-ifab-navy">Matrice Impatto × Prontezza</h3>
          <MatriceImpattoProntezza esiti={esiti} />
        </section>

        {criteriTaciti && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{esiti[0].notaCriteriTaciti}</span>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {esiti.map((e, i) => {
            const recommended = i === 0;
            const selected = selectedId === e.domandaId;
            return (
            <section
              key={e.domandaId}
              className={`rounded-xl border bg-white p-5 ${
                selected ? "border-ifab-blue ring-2 ring-ifab-blue/20" : "border-ifab-border"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: e.colore }}
                  >
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-ifab-navy">{e.nome}</h3>
                    <p className="mt-0.5 text-xs text-ifab-text-muted">{etichettaCaratteristica(e.blocco)}</p>
                    {recommended && (
                      <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                        <Star size={12} /> Valore più alto · consigliata
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-ifab-navy">{Math.round(e.punteggio)}</p>
                  <p className="text-[11px] text-ifab-text-muted">
                    impatto {arrotonda(e.impatto)} × prontezza {arrotonda(e.prontezza)}
                  </p>
                </div>
              </div>

              <p className="mt-4 text-sm text-ifab-text-muted">{e.motivazione}</p>
              <button
                type="button"
                onClick={() => void selectCandidate(e.domandaId)}
                disabled={savingChoice}
                className={`mt-4 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
                  selected
                    ? "bg-ifab-blue text-white"
                    : "border border-ifab-navy text-ifab-navy hover:bg-ifab-navy hover:text-white"
                }`}
              >
                {selected && <CheckCircle2 size={16} />}
                {selected ? "Scelta del partecipante" : "Scegli questa opzione"}
              </button>
            </section>
          )})}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ifab-border bg-white p-4">
        <p className="text-sm text-ifab-text-muted">
          {selectedId
            ? "La tua scelta è salvata. Puoi procedere allo Step 4."
            : "Seleziona una delle tre opzioni prima di procedere allo Step 4."}
        </p>
        <button
          type="button"
          onClick={onProceed}
          disabled={!selectedId || savingChoice}
          className="rounded-lg bg-ifab-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-ifab-navy-deep disabled:cursor-not-allowed disabled:opacity-40"
        >
          Procedi allo Step 4
        </button>
      </div>
    </div>
  );
}
