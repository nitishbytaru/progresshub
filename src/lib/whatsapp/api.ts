import "server-only";

/** Thin client for Meta's WhatsApp Cloud API. Interactive messages only work inside the 24-hour window. */

const GRAPH = "https://graph.facebook.com/v24.0";
const BODY_MAX = 1024; // interactive message body limit

export type Button = { id: string; title: string };

async function post(payload: Record<string, unknown>) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) throw new Error("WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID is not set");
  const res = await fetch(`${GRAPH}/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(8_000),
    body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
  });
  if (!res.ok) throw new Error(`whatsapp send failed (${res.status}): ${await res.text()}`);
}

const interactive = (to: string, body: Record<string, unknown>) => post({ recipient_type: "individual", to, type: "interactive", interactive: body });
const clamp = (text: string) => text.slice(0, BODY_MAX);

export const sendText = (to: string, text: string) => post({ to, type: "text", text: { body: text, preview_url: false } });

/** Up to 3 reply buttons. */
export const sendButtons = (to: string, text: string, buttons: Button[]) =>
  interactive(to, {
    type: "button",
    body: { text: clamp(text) },
    action: { buttons: buttons.map((b) => ({ type: "reply", reply: b })) },
  });

/** A tap-to-open list of up to 10 rows. */
export const sendList = (to: string, text: string, label: string, rows: Button[]) =>
  interactive(to, {
    type: "list",
    body: { text: clamp(text) },
    action: { button: label, sections: [{ title: "progresshub", rows }] },
  });

/** A single link button (WhatsApp doesn't allow it alongside reply buttons here). */
export const sendLinkButton = (to: string, text: string, label: string, url: string, footer?: string) =>
  interactive(to, {
    type: "cta_url",
    body: { text: clamp(text) },
    ...(footer ? { footer: { text: footer } } : {}),
    action: { name: "cta_url", parameters: { display_text: label, url } },
  });

/** An approved template: the only message allowed outside the 24-hour window. */
export const sendTemplate = (to: string, name: string, language: string) => post({ to, type: "template", template: { name, language: { code: language } } });

/** Marks the message read and shows "typing…". Cosmetic, so failures are ignored. */
export const showTyping = (messageId: string) => post({ status: "read", message_id: messageId, typing_indicator: { type: "text" } }).catch(() => {});
