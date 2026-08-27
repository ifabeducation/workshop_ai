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

// Assistenti di supporto (Step 1 e 2): spiegano le domande e chiariscono
// dubbi, senza reasoning pesante — il modello più economico della gamma
// disponibile in questa integrazione (nessun costo di input/output più basso
// tra i modelli OpenAI correnti, vedi la famiglia GPT-5).
export const CHAT_MODEL = "gpt-5-nano";

// Intervista dello Step 4: qui serve reasoning reale (estrarre più campi da
// una risposta, capire cosa manca, riconoscere l'intenzione di terminare,
// valutare quando l'intervista è ragionevolmente esaurita) — GPT-5 mini.
// Nota: i modelli della famiglia GPT-5 non supportano il parametro
// `temperature` (accettano solo il valore di default): le chiamate che usano
// questi modelli non lo passano, vedi api/agent/route.ts.
export const USE_CASE_MODEL = "gpt-5-mini";
