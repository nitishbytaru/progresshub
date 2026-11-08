import "server-only";
import { isoDate, toUTC } from "../progress";
import type { ParsedLog } from "./parse";

// Small, fast model on Groq; it reasons briefly, so leave room in max_tokens.
const MODEL = "openai/gpt-oss-20b";
const TIMEOUT_MS = 5_000;

/**
 * Fallback reader for messages the code parser couldn't handle ("ended the day around 28 thousand
 * on the 7th"). Groq only proposes {date, kind, value}; the bot still validates it and asks the
 * creator to confirm before anything is saved. Returns null on no key, timeout, or a vague answer.
 */
export async function extractWithGroq(text: string, today: string): Promise<ParsedLog | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key || text.length > 500) return null;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        max_tokens: 400,
        reasoning_effort: "low",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: [
              "You read one message from a creator logging their X (Twitter) impressions.",
              `Today is ${today} (YYYY-MM-DD). Reply with JSON only: {"date": "YYYY-MM-DD" | null, "kind": "total" | "gain", "value": integer | null}.`,
              '"total" = cumulative impressions overall. "gain" = impressions added since the last log ("added", "gained", "+").',
              "Expand shorthand: 1.2k = 1200, 3 lakh = 300000, 1.5m = 1500000.",
              "Resolve relative days (today, yesterday, last Monday, the 7th) against today. Default date: today.",
              'If there is no clear impression number, return {"date": null, "kind": "total", "value": null}. Never guess.',
            ].join("\n"),
          },
          { role: "user", content: text },
        ],
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const out = JSON.parse(json.choices?.[0]?.message?.content ?? "{}") as Record<string, unknown>;

    const value = typeof out.value === "number" && Number.isSafeInteger(out.value) && out.value > 0 ? out.value : null;
    const date = typeof out.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(out.date) ? out.date : null;
    if (!value || !date || isoDate(toUTC(date)) !== date) return null;
    return { date, kind: out.kind === "gain" ? "gain" : "total", value };
  } catch {
    return null; // timeout, network, or bad JSON: the bot asks for just the number
  }
}
