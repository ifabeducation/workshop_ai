import { NextResponse } from "next/server";
import { getOpenAI, CHAT_MODEL, USE_CASE_MODEL } from "@/lib/openaiClient";
import { buildStep1SystemPrompt, buildStep2SystemPrompt } from "@/config/block1Frizione";
import {
  BLOCK2_FIELDS,
  buildUseCaseInterviewSystemPrompt,
  isBlock2ValueFilled,
  remainingInterviewGroups,
  sanitizeClosedGroups,
  sanitizeInterviewFields,
} from "@/config/block2Form";
import { Block2FieldValue } from "@/lib/types";

type AgentContext = {
  /** Step 1 e 2: attività selezionate dal partecipante. */
  selectedActivityLabels?: string[];
  /** Step 4: attività emersa dal Blocco 1, stato della scheda e dell'intervista. */
  processoContext?: string;
  values?: Record<string, Block2FieldValue>;
  closedGroups?: string[];
  /** Vero se il turno precedente dell'agente ha chiesto conferma di procedere nonostante campi incompleti. */
  awaitingFinishConfirmation?: boolean;
};

/**
 * Almeno un argomento deve essere già stato chiuso prima che il server accetti
 * una richiesta di chiusura anticipata (conferma chiesta o accolta): impedisce
 * che un "ho finito" scritto al primo messaggio salti l'intervista, anche se
 * il modello — per errore o per assecondare l'utente — la propone comunque.
 */
const MIN_CLOSED_GROUPS_BEFORE_FINISH = 1;

/**
 * Gli assistenti del Blocco 1 sono di supporto: spiegano e chiariscono, non
 * conducono un'intervista. Quello dello Step 4 invece la conduce, e la sua
 * risposta è JSON (testo + campi estratti + argomenti chiusi): per questo il
 * ramo `useCaseInterview` è gestito a parte.
 */
function supportPromptFor(subsection: string, context: AgentContext): string | null {
  switch (subsection) {
    case "step1":
      return buildStep1SystemPrompt();
    case "step2":
      return buildStep2SystemPrompt(context.selectedActivityLabels ?? []);
    default:
      return null;
  }
}

type ChatTurn = { role: "user" | "assistant"; content: string };

function normalizeMessages(messages: unknown): ChatTurn[] {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((m): m is ChatTurn => Boolean(m) && typeof (m as ChatTurn).content === "string")
    .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
}

/**
 * Intervista dello Step 4. Gli argomenti ancora aperti li decide il server dai
 * `closedGroups` accumulati, non il modello: così l'avanzamento (e quindi il
 * passaggio alla scheda) non dipende da quanto il modello ricorda della
 * conversazione. Anche `done` è calcolato qui.
 */
async function runUseCaseInterview(messages: ChatTurn[], context: AgentContext) {
  const values = context.values ?? {};
  const closedBefore = sanitizeClosedGroups(context.closedGroups);
  const remaining = remainingInterviewGroups(closedBefore);
  const awaitingFinishConfirmationBefore = Boolean(context.awaitingFinishConfirmation);

  const systemPrompt = buildUseCaseInterviewSystemPrompt({
    processoContext: context.processoContext ?? "",
    remainingGroups: remaining,
    compiledFieldIds: BLOCK2_FIELDS.filter((f) => isBlock2ValueFilled(values[f.id])).map((f) => f.id),
    currentValues: values,
    awaitingFinishConfirmation: awaitingFinishConfirmationBefore,
  });

  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: USE_CASE_MODEL,
    messages: [{ role: "system", content: systemPrompt }, ...messages],
    // GPT-5 mini non supporta il parametro temperature (solo il default): va omesso.
    response_format: { type: "json_object" },
  });

  const raw = (response.choices[0]?.message?.content ?? "").trim();
  let parsed: {
    reply?: unknown;
    fields?: unknown;
    closed?: unknown;
    unavailable?: unknown;
    askingFinishConfirmation?: unknown;
    finishConfirmed?: unknown;
  } = {};
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    // Il modello ha risposto in chiaro invece che in JSON: si salva almeno il
    // testo, l'estrazione riparte al turno successivo.
    parsed = { reply: raw };
  }

  const reply = typeof parsed.reply === "string" && parsed.reply.trim() ? parsed.reply.trim() : raw;
  const fields = sanitizeInterviewFields(parsed.fields);
  const mergedValues = { ...values, ...fields };
  const knownFieldIds = new Set(BLOCK2_FIELDS.map((field) => field.id));
  const unavailable = new Set(
    Array.isArray(parsed.unavailable)
      ? parsed.unavailable.filter((id): id is string => typeof id === "string" && knownFieldIds.has(id))
      : []
  );
  const requestedClosed = Array.isArray(parsed.closed)
    ? parsed.closed.filter((key): key is string => typeof key === "string")
    : [];
  const completeClosed = requestedClosed.filter((key) => {
    const group = remaining.find((candidate) => candidate.key === key);
    return Boolean(
      group?.fields.every(
        (fieldId) =>
          isBlock2ValueFilled(mergedValues[fieldId]) ||
          unavailable.has(fieldId) ||
          fieldId === "obiettiviAltro" ||
          (fieldId === "eticaCategorie" && mergedValues.eticaDecisioni === "no")
      )
    );
  });
  const closedGroups = sanitizeClosedGroups(completeClosed, closedBefore);
  const remainingAfter = remainingInterviewGroups(closedGroups);
  const naturallyComplete = remainingAfter.length === 0;

  // Rete di sicurezza: la chiusura anticipata (chiedere o accogliere la
  // conferma di procedere con campi incompleti) è valida solo se è già stato
  // chiuso almeno un argomento. Così un "ho finito" al primissimo messaggio
  // non ottiene né la domanda di conferma né, tantomeno, l'accesso — anche se
  // il modello, per assecondare l'utente, la propone comunque.
  const enoughEngagementForFinish = closedBefore.length >= MIN_CLOSED_GROUPS_BEFORE_FINISH;
  const finishConfirmed =
    awaitingFinishConfirmationBefore && enoughEngagementForFinish && Boolean(parsed.finishConfirmed);
  const askingFinishConfirmation =
    !finishConfirmed && enoughEngagementForFinish && Boolean(parsed.askingFinishConfirmation);

  const canProceedToUseCase = naturallyComplete || finishConfirmed;

  return NextResponse.json({
    reply,
    fields,
    closedGroups,
    remaining: remainingAfter.map((g) => g.key),
    done: naturallyComplete,
    awaitingFinishConfirmation: askingFinishConfirmation,
    canProceedToUseCase,
    finished: false,
  });
}

export async function POST(req: Request) {
  try {
    const { subsection, messages, context } = await req.json();

    if (!subsection || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
    }

    const turns = normalizeMessages(messages);
    const ctx: AgentContext = context ?? {};

    if (subsection === "useCaseInterview") {
      return await runUseCaseInterview(turns, ctx);
    }

    const systemPrompt = supportPromptFor(subsection, ctx);
    if (!systemPrompt) {
      return NextResponse.json({ error: "subsection non valida" }, { status: 400 });
    }

    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [{ role: "system", content: systemPrompt }, ...turns],
      // GPT-5 nano non supporta il parametro temperature (solo il default): va omesso.
    });

    // Gli assistenti del Blocco 1 sono di supporto: non concludono step, quindi
    // `finished` resta sempre false (il campo è mantenuto per AgentChat).
    const reply = (response.choices[0]?.message?.content ?? "").trim();
    return NextResponse.json({ reply, finished: false });
  } catch (error) {
    console.error("Errore agente AI:", error);
    const message = error instanceof Error ? error.message : "Errore interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
