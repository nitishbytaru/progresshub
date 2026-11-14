import "server-only";

/**
 * Shared Groq client (OpenAI-compatible chat API). Used by the Telegram/WhatsApp bots and the fit
 * coach. Always returns null on any failure (no key, timeout, HTTP error, bad JSON) so callers
 * can fall back to rules. Never send names, emails or handles in `user`/`system`.
 */
export const GROQ_MODEL = "openai/gpt-oss-20b";

type JsonCall = {
  system: string;
  user: string;
  maxTokens?: number;
  timeoutMs?: number;
  temperature?: number;
  model?: string;
};

export async function groqJSON(call: JsonCall): Promise<Record<string, unknown> | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(call.timeoutMs ?? 6_000),
      body: JSON.stringify({
        model: call.model ?? GROQ_MODEL,
        temperature: call.temperature ?? 0,
        max_tokens: call.maxTokens ?? 500,
        reasoning_effort: "low",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: call.system },
          { role: "user", content: call.user },
        ],
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const out = JSON.parse(json.choices?.[0]?.message?.content ?? "null") as unknown;
    return out && typeof out === "object" && !Array.isArray(out) ? (out as Record<string, unknown>) : null;
  } catch {
    return null; // timeout, network or bad JSON
  }
}
