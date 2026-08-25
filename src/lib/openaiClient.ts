import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (client) return client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY non configurata in .env.local");
  }
  client = new OpenAI({ apiKey });
  return client;
}

/** Assistenti di supporto (Step 1 e 2): spiegano e chiariscono, non serve reasoning pesante. */
export const CHAT_MODEL = "gpt-4o-mini";

/**
 * Intervista dello Step 4: qui l'agente deve valutare se una risposta è
 * davvero sufficiente, individuare cosa manca, fare follow-up mirati e non
 * accontentarsi di risposte vaghe — serve il modello con il miglior reasoning
 * disponibile in questa integrazione OpenAI, anche se più lento o costoso di
 * quello usato per le chat di supporto (vedi README/DEPLOYMENT per i costi).
 */
export const REASONING_CHAT_MODEL = "gpt-4o";
