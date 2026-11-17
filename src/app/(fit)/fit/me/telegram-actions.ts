"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true; url?: string } | { ok: false; error: string };

/**
 * Starts linking the fit Telegram bot: stores a one-time code's hash (valid 10 minutes) with the
 * browser's time zone, and returns the t.me deep link that sends `/start <code>` to the bot.
 */
export async function createFitTelegramLink(tz: unknown): Promise<Result> {
  const bot = process.env.NEXT_PUBLIC_TELEGRAM_FIT_BOT_USERNAME;
  if (!bot) return { ok: false, error: "The fit Telegram bot isn't set up yet." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Your session expired. Sign in again." };

  const zone = typeof tz === "string" && tz.length <= 64 ? tz : "UTC";
  const code = randomBytes(24).toString("base64url");
  const { error } = await supabase.from("fit_telegram_link_tokens").insert({
    token_hash: createHash("sha256").update(code).digest("hex"),
    user_id: user.id,
    tz: zone,
  });
  if (error) return { ok: false, error: "Couldn't start linking. Try again in a moment." };
  return { ok: true, url: `https://t.me/${bot.replace(/^@/, "")}?start=${code}` };
}

export async function disconnectFitTelegram(): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Your session expired. Sign in again." };
  const { error } = await supabase.from("fit_telegram_links").delete().eq("user_id", user.id);
  if (error) return { ok: false, error: "Couldn't disconnect. Try again." };
  revalidatePath("/fit/me");
  return { ok: true };
}
