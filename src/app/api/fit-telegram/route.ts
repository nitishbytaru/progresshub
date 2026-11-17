import { webhookCallback } from "grammy";
import { createFitBot } from "@/lib/fit-telegram/bot";
import { firstTimeSeenFit } from "@/lib/fit-telegram/data";

/**
 * Fit Telegram bot webhook (a separate bot from /api/telegram). Register once after deploy:
 *   https://api.telegram.org/bot<TELEGRAM_FIT_BOT_TOKEN>/setWebhook?url=<SITE>/api/fit-telegram&secret_token=<TELEGRAM_FIT_WEBHOOK_SECRET>
 */
let handler: ((req: Request) => Promise<Response>) | null = null;

export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_FIT_WEBHOOK_SECRET;
  if (!secret || req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Telegram retries when a reply is slow; handle each update only once.
  const update = (await req.clone().json().catch(() => null)) as { update_id?: unknown } | null;
  if (typeof update?.update_id === "number" && !(await firstTimeSeenFit(update.update_id))) {
    return new Response("ok");
  }

  handler ??= webhookCallback(createFitBot(), "std/http", { secretToken: secret, onTimeout: "return", timeoutMilliseconds: 9_000 });
  return handler(req);
}
