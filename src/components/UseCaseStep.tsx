"use client";

import { Ref, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, FileDown, Save } from "lucide-react";
import {
  BLOCK2_SECTIONS,
  block2ValueLabel,
  isBlock2ValueFilled,
  remainingInterviewGroups,
} from "@/config/block2Form";
import { calcolaEsiti, candidateAttive } from "@/lib/frizioneScoring";
import {
  Block2FieldValue,
  Block2Submission,
  ChatMessage,
  Step1Submission,
  Step2Submission,
} from "@/lib/types";
import { submitBlock2 } from "@/lib/clientApi";
import { nowMs } from "@/lib/time";
import { TEST_CLOSED_GROUPS, getRandomTestUseCase } from "@/lib/testData";
import { downloadUseCasePdf } from "@/lib/useCasePdf";
import UseCaseInterview, { InterviewTurn } from "./UseCaseInterview";

const TOTAL_FIELDS = BLOCK2_SECTIONS.reduce((n, s) => n + s.fields.length, 0);

/** Il pulsante "test" della pagina compila la scheda e la apre già piena. */
export type UseCaseStepHandle = {
  fillWithTestData: () => void;
};

/**
 * Step 4 — un unico step per il caso d'uso, in due fasi:
 *   1. intervista: l'agente parte dalla domanda generica sul processo e ricava
 *      i campi della scheda da quello che il partecipante racconta;
 *   2. scheda: gli stessi campi del template, precompilati e non modificabili
 *      manualmente, da confermare con l'export PDF in fondo.
 * La fase raggiunta vive lato server (`interviewDone`), così il rientro riapre
 * la scheda e non ricomincia la conversazione.
 */
export default function UseCaseStep({
  code,
  participantId,
  participantName,
  step1,
  step2,
  block2,
  onSaved,
  ref,
}: {
  code: string;
  participantId: string;
  participantName: string;
  step1?: Step1Submission;
  step2?: Step2Submission;
  block2?: Block2Submission;
  onSaved: (data: Block2Submission) => void;
  ref?: Ref<UseCaseStepHandle>;
}) {
  const initiallyNaturallyComplete = remainingInterviewGroups(block2?.closedGroups).length === 0;
  const initiallyAuthorized = Boolean(block2?.facilitatorUseCaseAuthorized);
  const [values, setValues] = useState<Record<string, Block2FieldValue>>(block2?.values ?? {});
  const [chatLog, setChatLog] = useState<ChatMessage[]>(block2?.chatLog ?? []);
  const [closedGroups, setClosedGroups] = useState<string[]>(block2?.closedGroups ?? []);
  const [phase, setPhase] = useState<"intervista" | "scheda">(
    block2?.completedAt ||
      (block2?.interviewDone && (initiallyNaturallyComplete || initiallyAuthorized))
      ? "scheda"
      : "intervista"
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(block2?.completedAt ?? null);
  const [exporting, setExporting] = useState(false);
  const [draftState, setDraftState] = useState<"idle" | "saving" | "saved">(
    block2?.updatedAt || block2?.completedAt ? "saved" : "idle"
  );

  // Stessa meccanica degli altri step: la bozza si salva da sola, così chiudere
  // il browser a metà scheda non fa perdere nulla e il rientro riparte da qui.
  const dirtyRef = useRef(false);
  const pendingRef = useRef<Record<string, Block2FieldValue> | null>(null);
  const onSavedRef = useRef(onSaved);

  // Lo Step 4 segue sempre la scelta effettiva del partecipante, non sostituita
  // dalla raccomandazione del sistema.
  const esiti = calcolaEsiti(step1, step2);
  const selectedAction = (
    step2?.step3Decision?.selected.nome ??
    esiti[0]?.nome ??
    candidateAttive(step1, step2).map((c) => c.nome).join(", ")
  ) || "Non disponibile";
  const processoContext =
    selectedAction;
  const compiled = BLOCK2_SECTIONS.flatMap((s) => s.fields).filter((f) =>
    isBlock2ValueFilled(values[f.id])
  ).length;
  const naturallyComplete = remainingInterviewGroups(closedGroups).length === 0;
  const facilitatorAuthorized = Boolean(block2?.facilitatorUseCaseAuthorized);
  const canShowScheda = Boolean(block2?.completedAt) || naturallyComplete || facilitatorAuthorized;
  const effectivePhase = phase === "scheda" && canShowScheda ? "scheda" : "intervista";

  useEffect(() => {
    onSavedRef.current = onSaved;
  });

  useEffect(() => {
    pendingRef.current = values;
    if (!dirtyRef.current) return;

    const timer = setTimeout(async () => {
      dirtyRef.current = false;
      setDraftState("saving");
      try {
        const data: Block2Submission = { values, updatedAt: nowMs() };
        await submitBlock2(code, participantId, data);
        onSavedRef.current(data);
        setDraftState("saved");
      } catch {
        dirtyRef.current = true;
        setDraftState("idle");
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [values, code, participantId]);

  useEffect(() => {
    return () => {
      const pending = pendingRef.current;
      if (!dirtyRef.current || !pending) return;
      dirtyRef.current = false;
      void submitBlock2(code, participantId, { values: pending, updatedAt: nowMs() });
    };
  }, [code, participantId]);

  useImperativeHandle(ref, () => ({
    fillWithTestData: () => {
      const testValues = getRandomTestUseCase();
      dirtyRef.current = true;
      setDraftState("idle");
      setValues((prev) => ({ ...prev, ...testValues }));
      setClosedGroups(TEST_CLOSED_GROUPS);
      setPhase("scheda");
      void submitBlock2(code, participantId, {
        values: testValues,
        closedGroups: TEST_CLOSED_GROUPS,
        interviewDone: true,
        updatedAt: nowMs(),
      });
    },
  }));

  /** Un turno di intervista: i campi ricavati entrano nella scheda e si salvano. */
  async function handleTurn(turn: InterviewTurn) {
    const merged = { ...values, ...turn.fields };
    setValues(merged);
    setChatLog(turn.chatLog);
    setClosedGroups(turn.closedGroups);
    setDraftState("saving");
    const data: Block2Submission = {
      values: merged,
      chatLog: turn.chatLog,
      closedGroups: turn.closedGroups,
      updatedAt: nowMs(),
    };
    try {
      await submitBlock2(code, participantId, data);
      onSaved(data);
      setDraftState("saved");
    } catch {
      setDraftState("idle");
    }
  }

  /** Fine dell'intervista decisa dall'agente: si apre la scheda da confermare. */
  async function openScheda(viaFacilitatorAuthorization = false) {
    setPhase("scheda");
    const now = nowMs();
    const data: Block2Submission = {
      interviewDone: true,
      facilitatorAuthorizationUsedAt: viaFacilitatorAuthorization ? now : undefined,
      updatedAt: now,
    };
    try {
      await submitBlock2(code, participantId, data);
      onSaved(data);
    } catch {
      // La fase è un comfort per il rientro: se non si salva si prosegue.
    }
  }

  function backToInterview() {
    setPhase("intervista");
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      dirtyRef.current = false;
      const data: Block2Submission = {
        values,
        interviewDone: true,
        updatedAt: nowMs(),
        completedAt: nowMs(),
      };
      await submitBlock2(code, participantId, data);
      onSaved(data);
      setSavedAt(nowMs());
      setDraftState("saved");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Non è stato possibile confermare lo Use Case");
    } finally {
      setSaving(false);
    }
  }

  async function handleExportPdf() {
    setExporting(true);
    try {
      await downloadUseCasePdf({
        participantName,
        code,
        values,
        chatLog,
        decision: step2?.step3Decision,
        candidates: esiti,
        now: nowMs(),
      });
    } finally {
      setExporting(false);
    }
  }

  if (effectivePhase === "intervista") {
    return (
      <UseCaseInterview
        processoContext={processoContext}
        selectedAction={selectedAction}
        values={values}
        closedGroups={closedGroups}
        chatLog={chatLog}
        onTurn={handleTurn}
        facilitatorAuthorized={facilitatorAuthorized}
        onDone={() => void openScheda(false)}
        onAuthorizedProceed={() => void openScheda(true)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="mb-1 text-lg font-semibold text-ifab-navy">Step 4 · Scheda Use Case</h2>
        <p className="text-sm text-ifab-text-muted">
          Queste sono le informazioni che ho raccolto dalla conversazione, organizzate nei campi della scheda.
          Controllale: se manca qualcosa, torna alla conversazione e spiegalo all&apos;assistente.
        </p>
        <p className="mt-3 rounded-lg border border-ifab-blue/30 bg-ifab-blue/5 px-3 py-2 text-sm font-medium text-ifab-navy">
          Azione selezionata: {selectedAction}
        </p>
        <p className="mt-2 text-xs text-ifab-text-muted">
          Campi compilati: {compiled}/{TOTAL_FIELDS}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-ifab-blue/30 bg-ifab-blue/5 px-4 py-3">
        <button
          type="button"
          onClick={() => backToInterview()}
          className="flex items-center gap-2 rounded-lg border border-ifab-blue px-3 py-1.5 text-xs font-semibold text-ifab-blue-dark transition hover:bg-ifab-blue hover:text-white"
        >
          <ArrowLeft size={14} /> Torna alla conversazione
        </button>
        <span className="text-xs text-ifab-text-muted">
          Serve per aggiungere o cambiare qualcosa attraverso la conversazione.
        </span>
      </div>

      {BLOCK2_SECTIONS.map((section) => (
        <section key={section.key} className="rounded-xl border border-ifab-border bg-white p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <h3 className="text-sm font-semibold text-ifab-blue-dark">
              {section.number} · {section.title}
            </h3>
          </div>

          <div className="flex flex-col gap-4">
            {section.fields.map((field) => (
              <div key={field.id}>
                <label className="mb-1 block text-xs font-medium text-ifab-text-muted">{field.label}</label>
                <div className="whitespace-pre-wrap rounded-lg bg-ifab-bg-soft px-3 py-2 text-sm leading-relaxed text-ifab-text">
                  {isBlock2ValueFilled(values[field.id])
                    ? block2ValueLabel(field, values[field.id])
                    : "— Informazione non disponibile / non conosciuta dal partecipante"}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-ifab-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-ifab-navy-deep disabled:opacity-50"
        >
          <Save size={16} /> {saving ? "Salvataggio..." : "Confermo la scheda"}
        </button>
        <button
          type="button"
          onClick={handleExportPdf}
          disabled={exporting}
          className="flex items-center gap-2 rounded-lg border border-ifab-navy px-4 py-2 text-sm font-semibold text-ifab-navy transition hover:bg-ifab-navy hover:text-white disabled:opacity-50"
        >
          <FileDown size={16} /> {exporting ? "Preparo il PDF..." : "Scarica PDF"}
        </button>
        {savedAt && (
          <span className="flex items-center gap-1 text-xs text-emerald-600">
            <CheckCircle2 size={14} /> Scheda confermata
          </span>
        )}
        {!savedAt && draftState !== "idle" && (
          <span className="text-xs text-ifab-text-muted">
            {draftState === "saving" ? "Salvataggio bozza..." : "Bozza salvata — la ritrovi al rientro"}
          </span>
        )}
        {saveError && <span className="text-xs text-red-600">{saveError}</span>}
      </div>
    </div>
  );
}
