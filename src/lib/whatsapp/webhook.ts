import { createHmac, timingSafeEqual } from "node:crypto";

/** Pure helpers for Meta's webhook: signature check, payload parsing and text conversion. */

export type Inbound = {
  from: string;
  messageId: string;
  /** Typed text, or the label of a tapped template quick-reply. */
  text?: string;
  /** The id of a tapped reply button or list row. */
  action?: string;
};

/** Checks X-Hub-Signature-256: an HMAC-SHA256 of the raw body, keyed with the app secret. */
export function verifySignature(raw: string, header: string | null, appSecret: string) {
  if (!header) return false;
  const expected = Buffer.from(`sha256=${createHmac("sha256", appSecret).update(raw).digest("hex")}`);
  const given = Buffer.from(header);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

type RawMessage = {
  id?: string;
  from?: string;
  type?: string;
  text?: { body?: string };
  button?: { text?: string };
  interactive?: { button_reply?: { id?: string }; list_reply?: { id?: string } };
};
type RawBody = {
  entry?: { changes?: { field?: string; value?: { metadata?: { phone_number_id?: string }; messages?: RawMessage[] } }[] }[];
};

/** The user messages for our number. Delivery statuses and media are ignored, as on Telegram. */
export function parseWebhook(body: unknown, phoneNumberId: string): Inbound[] {
  const out: Inbound[] = [];
  for (const entry of (body as RawBody)?.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages" || change.value?.metadata?.phone_number_id !== phoneNumberId) continue;
      for (const m of change.value.messages ?? []) {
        if (!m.id || !m.from) continue;
        const base = { from: m.from, messageId: m.id };
        if (m.type === "text" && m.text?.body) out.push({ ...base, text: m.text.body });
        else if (m.type === "button" && m.button?.text) out.push({ ...base, text: m.button.text });
        else if (m.type === "interactive") {
          const action = m.interactive?.button_reply?.id ?? m.interactive?.list_reply?.id;
          if (action) out.push({ ...base, action });
        }
      }
    }
  }
  return out;
}

/** Converts the shared Telegram-HTML wording to WhatsApp's *bold* / _italic_ markup. */
export const toWhatsApp = (html: string) =>
  html
    .replace(/<\/?b>/g, "*")
    .replace(/<\/?i>/g, "_")
    .replace(/<\/?code>/g, "```")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
