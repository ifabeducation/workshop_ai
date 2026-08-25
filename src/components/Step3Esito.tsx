"use client";

import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileDown, Sparkles } from "lucide-react";
import { Step1Submission, Step2Submission, Step3Choice } from "@/lib/types";
import { calcolaEsiti, etichettaCaratteristica } from "@/lib/frizioneScoring";
import { submitStep3 } from "@/lib/clientApi";
import { nowMs } from "@/lib/time";
import MatriceImpattoProntezza from "./MatriceImpattoProntezza";

/** Un decimale solo quando serve: la barra ora è a scala decimale. */
function arrotonda(v: number): string {
  return v % 1 === 0 ? String(v) : v.toFixed(1);
}

/**
 * Step 3 — esito e scelta finale. Impatto, prontezza e punteggio restano
 * calcolati da step1 + step2 (nessun dato proprio, vedi frizioneScoring.ts):
 * qui il partecipante sceglie liberamente su quale candidata procedere allo
 * Step 4. Il sistema individua e mostra la candidata a punteggio più alto,
 * ma non sostituisce mai la decisione: se si sceglie un'altra opzione va
 * confermato esplicitamente, e raccomandazione e scelta si salvano separate
 * (Step3Choice) così la dashboard del facilitatore può mostrare entrambe.
 */
export default function Step3Esito({
  code,
  participantId,
  participantName,
  step1,
  step2,
  step3,
  onSaved,
}: {
  code: string;
  participantId: string;
  participantName: string;
  step1?: Step1Submission;
  step2?: Step2Submission;
  step3?: Step3Choice;
  onSaved: (data: Step3Choice) => void;
}) {
  const printRef = useRef<HTMLDivElement>(null);
  const esiti = calcolaEsiti(step1, step2);
  const criteriTaciti = Boolean(step1?.criteriTaciti);
  const best = esiti[0];
  const chosenId = step3?.chosenDomandaId;
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  async function confermaScelta(domandaId: number) {
    const scelta = esiti.find((e) => e.domandaId === domandaId);
    if (!scelta || !best) return;
    setSaving(true);
    try {
      const payload: Step3Choice = {
        bestDomandaId: best.domandaId,
        bestNome: best.nome,
        bestPunteggio: best.punteggio,
        chosenDomandaId: scelta.domandaId,
        chosenNome: scelta.nome,
        chosenPunteggio: scelta.punteggio,
        followedRecommendation: scelta.domandaId === best.domandaId,
        confirmedNonOptimal: scelta.domandaId !== best.domandaId ? true : undefined,
        updatedAt: nowMs(),
        completedAt: nowMs(),
      };
      await submitStep3(code, participantId, payload);
      onSaved(payload);
      setPendingId(null);
    } finally {
      setSaving(false);
    }
  }

  /** Scegliere la candidata consigliata non richiede conferma aggiuntiva. */
  function handleScegli(domandaId: number) {
    if (best && domandaId !== best.domandaId) {
      setPendingId(domandaId);
      return;
    }
    void confermaScelta(domandaId);
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
            Le tue candidate posizionate per impatto e prontezza, in ordine di punteggio.
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

        <section>
          <h3 className="mb-1 text-sm font-semibold text-ifab-navy">Scegli su quale procedere</h3>
          <p className="mb-3 text-xs text-ifab-text-muted">
            Il sistema individua la candidata con il punteggio più alto, ma la decisione finale è tua: puoi
            procedere con una delle altre due, con una conferma esplicita.
          </p>

          <div className="flex flex-col gap-3">
            {esiti.map((e, i) => {
              const isBest = best?.domandaId === e.domandaId;
              const isChosen = chosenId === e.domandaId;
              return (
                <section
                  key={e.domandaId}
                  className={`rounded-xl border bg-white p-5 transition ${
                    isChosen ? "border-ifab-blue ring-1 ring-ifab-blue" : "border-ifab-border"
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
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-ifab-navy">{e.nome}</h3>
                          {isBest && (
                            <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                              <Sparkles size={11} /> Punteggio più alto
                            </span>
                          )}
                          {isChosen && (
                            <span className="flex items-center gap-1 rounded-full bg-ifab-blue/10 px-2 py-0.5 text-[11px] font-semibold text-ifab-blue">
                              <CheckCircle2 size={11} /> Tua scelta
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-ifab-text-muted">{etichettaCaratteristica(e.blocco)}</p>
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

                  <div className="mt-4 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleScegli(e.domandaId)}
                      disabled={saving || isChosen}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-default ${
                        isChosen
                          ? "border-ifab-blue bg-ifab-blue text-white disabled:opacity-100"
                          : "border-ifab-navy text-ifab-navy hover:bg-ifab-navy hover:text-white disabled:opacity-50"
                      }`}
                    >
                      {isChosen ? "Candidata scelta" : "Scegli questa attività"}
                    </button>

                    {pendingId === e.domandaId && (
                      <div className="flex flex-1 flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        <AlertTriangle size={14} className="shrink-0" />
                        <span className="flex-1">
                          La scelta effettuata non corrisponde all&apos;opzione con il valore più alto. Vuoi
                          procedere comunque?
                        </span>
                        <button
                          type="button"
                          onClick={() => void confermaScelta(e.domandaId)}
                          disabled={saving}
                          className="rounded-lg bg-amber-600 px-2.5 py-1 font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60"
                        >
                          Continua comunque
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingId(null)}
                          className="rounded-lg border border-amber-400 px-2.5 py-1 font-semibold text-amber-900 transition hover:bg-amber-100"
                        >
                          Torna alla scelta
                        </button>
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </section>
      </div>

      {step3?.completedAt && (
        <p className="flex items-center gap-1.5 text-xs text-emerald-600">
          <CheckCircle2 size={14} />
          Scelta confermata: {step3.chosenNome}
          {step3.followedRecommendation === false && " (diversa dalla raccomandazione del sistema)"}. Puoi
          ancora cambiarla scegliendo un&apos;altra candidata qui sopra.
        </p>
      )}
    </div>
  );
}
