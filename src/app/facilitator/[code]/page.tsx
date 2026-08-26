"use client";

import { startTransition, use, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, LockOpen, LogOut, Users, Copy, FileDown, Trash2 } from "lucide-react";
import {
  facilitatorMe,
  facilitatorLogout,
  fetchState,
  fetchAggregate,
  unlockStep,
  deleteSession,
  setUseCaseAuthorization,
} from "@/lib/clientApi";
import { clearFacilitatorCode, saveFacilitatorCode } from "@/lib/participantStorage";
import { DOMANDE } from "@/config/block1Frizione";
import { BLOCK2_FIELDS, remainingInterviewGroups } from "@/config/block2Form";
import { calcolaEsiti } from "@/lib/frizioneScoring";
import { buildFacilitatorAnalytics } from "@/lib/facilitatorAnalytics";
import { nowMs } from "@/lib/time";
import { downloadUseCasePdf } from "@/lib/useCasePdf";
import { downloadFacilitatorExcel } from "@/lib/facilitatorExcel";
import { Participant, Submission, UnlockedSteps, DEFAULT_UNLOCKED_STEPS } from "@/lib/types";
import FacilitatorAnalyticsDashboard from "@/components/facilitator/FacilitatorAnalyticsDashboard";

const POLL_MS = 4000;

const BLOCK2_FIELD_COUNT = BLOCK2_FIELDS.length;

const STEP_ORDER: { key: keyof UnlockedSteps; label: string; block: 1 | 2 }[] = [
  { key: "step1", label: "1 · Scheda di attrito", block: 1 },
  { key: "step2", label: "2 · Caratteristiche", block: 1 },
  { key: "step3", label: "3 · Esito", block: 1 },
  { key: "useCase", label: "4 · Use Case (intervista + scheda)", block: 2 },
];

export default function FacilitatorDashboard({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [facilitatorName, setFacilitatorName] = useState("");
  const [unlockedSteps, setUnlockedSteps] = useState<UnlockedSteps>(DEFAULT_UNLOCKED_STEPS);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [rows, setRows] = useState<{ participant: Participant; submission: Submission }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sessionMissing, setSessionMissing] = useState(false);
  // Eliminazione in due passaggi: cancella dati di tutti i partecipanti.
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copiato, setCopiato] = useState(false);
  // Partecipante di cui si sta generando il PDF della scheda Use Case.
  const [pdfFor, setPdfFor] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [authorizationFor, setAuthorizationFor] = useState<string | null>(null);

  useEffect(() => {
    facilitatorMe()
      .then((me) => {
        if (!me.authenticated) throw new Error("not-auth");
        setFacilitatorName(me.name);
        setAuthChecked(true);
        // Sessione effettivamente aperta: diventa quella proposta al prossimo rientro,
        // anche se ci si è arrivati da un link invece che dal selettore.
        saveFacilitatorCode(code);
      })
      .catch(() => router.replace("/facilitator/login"));
  }, [router, code]);

  const poll = useCallback(async () => {
    try {
      const state = await fetchState(code);
      setUnlockedSteps(state.meta.unlockedSteps);
      const agg = await fetchAggregate(code);
      setParticipants(agg.rows.map((r) => r.participant));
      setRows(agg.rows);
      setError(null);
      setSessionMissing(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore di caricamento";
      // Sessione scaduta o codice non più valido: da qui si torna al selettore
      // invece di restare su una dashboard che non aggiornerà mai nulla.
      setSessionMissing(/non valido|scadut/i.test(message));
      setError(message);
    }
  }, [code]);

  useEffect(() => {
    if (!authChecked) return;
    startTransition(() => {
      void poll();
    });
    const interval = setInterval(poll, POLL_MS);
    return () => clearInterval(interval);
  }, [authChecked, poll]);

  async function toggleStep(step: keyof UnlockedSteps) {
    const next = !unlockedSteps[step];
    setUnlockedSteps((prev) => ({ ...prev, [step]: next }));
    await unlockStep(code, step, next);
  }

  /** Scheda Use Case di un partecipante, in PDF, dai soli dati salvati. */
  async function handleUseCasePdf(participant: Participant, submission: Submission) {
    setPdfFor(participant.participantId);
    try {
      await downloadUseCasePdf({
        participantName: participant.name,
        code,
        values: submission.block2?.values ?? {},
        chatLog: submission.block2?.chatLog,
        decision: submission.step2?.step3Decision,
        candidates: calcolaEsiti(submission.step1, submission.step2),
        now: nowMs(),
      });
    } finally {
      setPdfFor(null);
    }
  }

  async function handleLogout() {
    await facilitatorLogout();
    clearFacilitatorCode();
    router.replace("/facilitator/login");
  }

  async function handleDeleteSession() {
    setDeleting(true);
    try {
      await deleteSession(code);
      clearFacilitatorCode();
      router.replace("/facilitator/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nell'eliminazione della sessione");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  /** Copia il solo codice: e' quello che il facilitatore detta o proietta. */
  async function copyCodice() {
    try {
      await navigator.clipboard.writeText(code);
      setCopiato(true);
      setTimeout(() => setCopiato(false), 2000);
    } catch {
      // Clipboard negata dal browser: il codice resta comunque leggibile sul pulsante.
    }
  }

  async function handleExportExcel() {
    setExporting(true);
    try {
      await downloadFacilitatorExcel(code, rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante l'esportazione Excel");
    } finally {
      setExporting(false);
    }
  }

  async function handleUseCaseAuthorization(participantId: string, authorized: boolean) {
    setAuthorizationFor(participantId);
    setError(null);
    try {
      const { submission } = await setUseCaseAuthorization(code, participantId, authorized);
      setRows((currentRows) =>
        currentRows.map((item) =>
          item.participant.participantId === participantId ? { ...item, submission } : item
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante l'aggiornamento dell'autorizzazione");
    } finally {
      setAuthorizationFor(null);
    }
  }

  const analytics = useMemo(() => buildFacilitatorAnalytics(rows), [rows]);

  if (!authChecked) return null;

  return (
    <div className="min-h-screen bg-ifab-navy">
      <header className="border-b border-white/10 bg-ifab-navy-deep px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-white/60">Facilitatore · {facilitatorName}</p>
            <h1 className="text-lg font-semibold text-white">Workshop AI Adoption — Blocco 1</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={copyCodice}
              className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/20"
              title="Copia il codice sessione"
            >
              <Copy size={15} /> Codice: <span className="font-mono tracking-widest">{code}</span>
              {copiato && <span className="text-xs font-normal text-white/70">copiato</span>}
            </button>
            {confirmDelete ? (
              <span className="flex items-center gap-1">
                <button
                  onClick={handleDeleteSession}
                  disabled={deleting}
                  className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                >
                  {deleting ? "Elimino..." : "Conferma eliminazione"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg px-2 py-2 text-sm text-white/70 transition hover:text-white"
                >
                  Annulla
                </button>
              </span>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                title="Elimina la sessione e tutti i dati dei partecipanti"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/70 transition hover:text-red-300"
              >
                <Trash2 size={15} /> Elimina
              </button>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/70 transition hover:text-white"
            >
              <LogOut size={15} /> Esci
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8">
        {error && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700">
            <span>{error}</span>
            {sessionMissing && (
              <button
                onClick={() => {
                  clearFacilitatorCode();
                  router.replace("/facilitator/login");
                }}
                className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-800"
              >
                Scegli un&apos;altra sessione
              </button>
            )}
          </div>
        )}

        <section className="mb-6 rounded-xl bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-ifab-navy">
            Sblocca gli step <span className="font-normal text-ifab-text-muted">— Blocco 1</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {STEP_ORDER.filter((s) => s.block === 1).map((s) => {
              const unlocked = unlockedSteps[s.key];
              return (
                <button
                  key={s.key}
                  onClick={() => toggleStep(s.key)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    unlocked
                      ? "border-ifab-blue bg-ifab-blue text-white"
                      : "border-ifab-border bg-white text-ifab-text hover:border-ifab-blue"
                  }`}
                >
                  {unlocked ? <LockOpen size={14} /> : <Lock size={14} />}
                  {s.label}
                </button>
              );
            })}
          </div>

          <h2 className="mb-3 mt-5 text-sm font-semibold text-ifab-navy">
            Sblocca gli step <span className="font-normal text-ifab-text-muted">— Blocco 2</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {STEP_ORDER.filter((s) => s.block === 2).map((s) => {
              const unlocked = unlockedSteps[s.key];
              return (
                <button
                  key={s.key}
                  onClick={() => toggleStep(s.key)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    unlocked
                      ? "border-ifab-blue bg-ifab-blue text-white"
                      : "border-ifab-border bg-white text-ifab-text hover:border-ifab-blue"
                  }`}
                >
                  {unlocked ? <LockOpen size={14} /> : <Lock size={14} />}
                  {s.label}
                </button>
              );
            })}
          </div>
        </section>

        <div className="rounded-xl bg-white p-5">
          <section className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-ifab-navy">
                <Users size={16} /> Partecipanti ({participants.length})
              </h2>
              <button
                onClick={() => void handleExportExcel()}
                disabled={exporting}
                className="flex items-center gap-2 rounded-lg border border-ifab-navy px-3 py-1.5 text-xs font-semibold text-ifab-navy transition hover:bg-ifab-navy hover:text-white"
              >
                <FileDown size={14} /> {exporting ? "Creazione Excel..." : "Esporta dashboard (.xlsx)"}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-ifab-border text-ifab-text-muted">
                    <th className="py-2 pr-4">Nome</th>
                    <th className="py-2 pr-4">Step 1</th>
                    <th className="py-2 pr-4">Step 2</th>
                    <th className="py-2 pr-4">Opzione con valore più alto</th>
                    <th className="py-2 pr-4">Scelta del partecipante</th>
                    <th className="py-2 pr-4">Decisione</th>
                    <th className="py-2 pr-4">Use Case</th>
                    <th className="py-2 pr-4">Scheda</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ participant, submission }) => {
                    const risposteDate = Object.values(submission.step1?.risposte ?? {}).filter(
                      (r) => r?.risposta
                    ).length;
                    const siDichiarati = Object.values(submission.step1?.risposte ?? {}).filter(
                      (r) => r?.risposta === "si"
                    ).length;
                    const esiti = calcolaEsiti(submission.step1, submission.step2);
                    const migliore = esiti[0];
                    const decision = submission.step2?.step3Decision;
                    // Blocco 2: distingue "consegnata" (Salva scheda) da "in bozza".
                    const useCaseFilled = Object.values(submission.block2?.values ?? {}).filter((v) =>
                      Array.isArray(v) ? v.length > 0 : Boolean(v && v.trim())
                    ).length;
                    const useCaseLabel = submission.block2?.completedAt
                      ? "✅"
                      : useCaseFilled > 0
                        ? `${useCaseFilled}/${BLOCK2_FIELD_COUNT}`
                        : "—";
                    const naturallyComplete =
                      remainingInterviewGroups(submission.block2?.closedGroups).length === 0;
                    const facilitatorAuthorized = Boolean(
                      submission.block2?.facilitatorUseCaseAuthorized
                    );
                    const hasInterviewWork = Boolean(
                      submission.block2?.chatLog?.some((message) => message.role === "user") ||
                        useCaseFilled > 0
                    );
                    const step4Status = submission.block2?.completedAt || naturallyComplete
                      ? "Completo"
                      : facilitatorAuthorized
                        ? "Autorizzato dal facilitatore"
                        : hasInterviewWork
                          ? "In compilazione"
                          : "Incompleto";
                    const step4StatusClass =
                      step4Status === "Completo"
                        ? "bg-emerald-50 text-emerald-700"
                        : step4Status === "Autorizzato dal facilitatore"
                          ? "bg-blue-50 text-blue-700"
                          : step4Status === "In compilazione"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-slate-100 text-slate-600";
                    return (
                      <tr key={participant.participantId} className="border-b border-ifab-border">
                        <td className="py-2 pr-4 font-medium text-ifab-text">
                          {participant.name}
                          {submission.step1?.criteriTaciti && (
                            <span
                              className="ml-1.5 text-amber-600"
                              title="Ha dichiarato criteri non documentati sulle eccezioni"
                            >
                              ⚠
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          {submission.step1?.completedAt
                            ? `✅ ${siDichiarati} sì`
                            : risposteDate > 0
                              ? `${risposteDate}/${DOMANDE.length}`
                              : "—"}
                        </td>
                        <td className="py-2 pr-4">
                          {submission.step2?.completedAt
                            ? "✅"
                            : Object.keys(submission.step2?.valori ?? {}).length > 0
                              ? "in corso"
                              : "—"}
                        </td>
                        <td className="py-2 pr-4 text-ifab-text-muted">
                          {decision
                            ? `${decision.recommended.nome} (${decision.recommended.punteggio.toFixed(1)})`
                            : migliore
                              ? `${migliore.nome} (${migliore.punteggio.toFixed(1)})`
                              : "—"}
                        </td>
                        <td className="py-2 pr-4 text-ifab-text-muted">
                          {decision
                            ? `${decision.selected.nome} (${decision.selected.punteggio.toFixed(1)})`
                            : "—"}
                        </td>
                        <td className="py-2 pr-4">
                          {decision
                            ? decision.selected.domandaId === decision.recommended.domandaId
                              ? "Seguita"
                              : decision.nonOptimalConfirmed
                                ? "Scelta diversa confermata"
                                : "Da confermare"
                            : "—"}
                        </td>
                        <td className="min-w-56 py-2 pr-4">
                          <div className="flex flex-col items-start gap-1.5">
                            <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${step4StatusClass}`}>
                              {step4Status}
                            </span>
                            <span className="text-[11px] text-ifab-text-muted">Campi: {useCaseLabel}</span>
                            {!submission.block2?.completedAt && !naturallyComplete && (
                              <button
                                type="button"
                                onClick={() =>
                                  void handleUseCaseAuthorization(
                                    participant.participantId,
                                    !facilitatorAuthorized
                                  )
                                }
                                disabled={authorizationFor === participant.participantId}
                                className={`rounded-lg border px-2 py-1 text-[11px] font-semibold transition disabled:opacity-50 ${
                                  facilitatorAuthorized
                                    ? "border-red-200 text-red-700 hover:bg-red-50"
                                    : "border-ifab-blue text-ifab-blue hover:bg-ifab-blue hover:text-white"
                                }`}
                              >
                                {authorizationFor === participant.participantId
                                  ? "Aggiornamento..."
                                  : facilitatorAuthorized
                                    ? "Revoca autorizzazione"
                                    : "Autorizza accesso allo Use Case"}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-2 pr-4">
                          {useCaseFilled > 0 ? (
                            <button
                              onClick={() => void handleUseCasePdf(participant, submission)}
                              disabled={pdfFor === participant.participantId}
                              title={`Scarica la scheda Use Case di ${participant.name} in PDF`}
                              className="flex items-center gap-1.5 rounded-lg border border-ifab-border px-2 py-1 text-[11px] font-semibold text-ifab-navy transition hover:border-ifab-navy hover:bg-ifab-navy hover:text-white disabled:opacity-50"
                            >
                              <FileDown size={12} />
                              {pdfFor === participant.participantId ? "Attendere..." : "PDF"}
                            </button>
                          ) : (
                            <span className="text-ifab-text-muted">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-4 text-center text-ifab-text-muted">
                        Nessun partecipante ancora connesso.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <FacilitatorAnalyticsDashboard analytics={analytics} />
        </div>
      </main>
    </div>
  );
}
