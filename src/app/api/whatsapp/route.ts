import { handleInbound } from "@/lib/whatsapp/bot";
import { firstTimeSeen } from "@/lib/whatsapp/data";
import { parseWebhook, verifySignature } from "@/lib/whatsapp/webhook";

/**
 * WhatsApp Cloud API webhook. In the Meta app, set the callback URL to <SITE>/api/whatsapp, the
 * verify token to WHATSAPP_VERIFY_TOKEN, and subscribe to the "messages" field.
 */

/** Meta's one-time subscription handshake. */
export function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const token = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!token || params.get("hub.mode") !== "subscribe" || params.get("hub.verify_token") !== token) {
    return new Response("Forbidden", { status: 403 });
  }
  return new Response(params.get("hub.challenge") ?? "");
}

export async function POST(req: Request) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const raw = await req.text();
  if (!appSecret || !phoneNumberId || !verifySignature(raw, req.headers.get("x-hub-signature-256"), appSecret)) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  for (const message of parseWebhook(body, phoneNumberId)) {
    try {
      if (!(await firstTimeSeen(message.messageId))) continue;
    } catch (e) {
      console.error(e);
      return new Response("Try again", { status: 500 }); // nothing handled yet, so let Meta retry
    }
    try {
      await handleInbound(message);
    } catch (e) {
      console.error("whatsapp bot error", e); // already marked seen, so a retry would be dropped
    }
  }
  return new Response("ok");
}
