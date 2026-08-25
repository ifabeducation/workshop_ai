import { NextResponse } from "next/server";
import { getOpenAI, CHAT_MODEL, REASONING_CHAT_MODEL } from "@/lib/openaiClient";
import { buildStep1SystemPrompt, buildStep2SystemPrompt } from "@/config/block1Frizione";
import {
  BLOCK2_FIELDS,
  BLOCK2_INTERVIEW_GROUPS,
  MIN_ATTEMPTS_BEFORE_GIVING_UP,
  buildUseCaseInterviewSystemPrompt,
  isBlock2ValueFilled,
  isTrivialAnswer,
  remainingInterviewGroups,
  sanitizeClosedGroups,
  sanitizeInterviewFields,
} from "@/config/block2Form";
import { Block2FieldValue } from "@/lib/types";

type AgentContext = {
  /** Step 1 e 2: attività selezionate dal partecipante. */
  selectedActivityLabels?: string[];
  /** Step 4: azione scelta nello Step 3, stato della scheda e dell'intervista. */
  processoContext?: string;
  values?: Record<string, Block2FieldValue>;
  closedGroups?: string[];
  /** Tentativi già fatti sull'argomento corrente, tenuti dal client turno per turno. */
  currentGroupAttempts?: number;
};

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
  const currentGroupBefore = remaining[0];
  const attemptsBefore = context.currentGroupAttempts ?? 0;

  const systemPrompt = buildUseCaseInterviewSystemPrompt({
    processoContext: context.processoContext ?? "",
    remainingGroups: remaining,
    compiledFieldIds: BLOCK2_FIELDS.filter((f) => isBlock2ValueFilled(values[f.id])).map((f) => f.id),
    currentGroupAttempts: attemptsBefore,
  });

  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: REASONING_CHAT_MODEL,
    messages: [{ role: "system", content: systemPrompt }, ...messages],
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const raw = (response.choices[0]?.message?.content ?? "").trim();
  let parsed: { reply?: unknown; fields?: unknown; closed?: unknown } = {};
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    // Il modello ha risposto in chiaro invece che in JSON: si salva almeno il
    // testo, l'estrazione riparte al turno successivo.
    parsed = { reply: raw };
  }

  const reply = typeof parsed.reply === "string" && parsed.reply.trim() ? parsed.reply.trim() : raw;
  let fields = sanitizeInterviewFields(parsed.fields);
  let closedGroups = sanitizeClosedGroups(parsed.closed, closedBefore);

  // Rete di sicurezza: se il modello ha chiuso l'argomento su cui l'ultima
  // risposta dell'utente era palesemente non informativa ("non lo so" e simili)
  // e non sono ancora stati fatti abbastanza tentativi, non lasciamo passare la
  // chiusura né i campi che ne deriverebbero — il prompt lo chiede già, questo
  // è solo il paracadute per quando il modello non lo rispetta.
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  if (
    currentGroupBefore &&
    attemptsBefore < MIN_ATTEMPTS_BEFORE_GIVING_UP &&
    isTrivialAnswer(lastUserMessage) &&
    closedGroups.includes(currentGroupBefore.key) &&
    !closedBefore.includes(currentGroupBefore.key)
  ) {
    closedGroups = closedGroups.filter((k) => k !== currentGroupBefore.key);
    const groupFieldIds = new Set(
      BLOCK2_INTERVIEW_GROUPS.find((g) => g.key === currentGroupBefore.key)?.fields ?? []
    );
    fields = Object.fromEntries(Object.entries(fields).filter(([id]) => !groupFieldIds.has(id)));
  }

  const remainingAfter = remainingInterviewGroups(closedGroups);

  return NextResponse.json({
    reply,
    fields,
    closedGroups,
    remaining: remainingAfter.map((g) => g.key),
    done: remainingAfter.length === 0,
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
      temperature: 0.6,
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
