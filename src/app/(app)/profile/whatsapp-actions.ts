"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true; url?: string } | { ok: false; error: string };

/**
 * Starts linking WhatsApp: stores a one-time code's hash (valid 10 minutes) with the browser's
 * time zone, and returns a wa.me link with "link <code>" ready to send to the bot.
 */
export async function createWhatsAppLink(tz: unknown): Promise<Result> {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "");
  if (!number) return { ok: false, error: "The WhatsApp bot isn't set up yet." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Your session expired. Sign in again." };

  const zone = typeof tz === "string" && tz.length <= 64 ? tz : "UTC";
  const code = randomBytes(24).toString("base64url");
  const { error } = await supabase.from("whatsapp_link_tokens").insert({
    token_hash: createHash("sha256").update(code).digest("hex"),
    user_id: user.id,
    tz: zone,
  });
  if (error) {
    if (error.code === "42P01") return { ok: false, error: "WhatsApp isn't set up on the server yet (database migration missing)." };
    return { ok: false, error: "Couldn't start linking. Try again in a moment." };
  }
  return { ok: true, url: `https://wa.me/${number}?text=${encodeURIComponent(`link ${code}`)}` };
}

export async function setWhatsAppReminders(on: unknown): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Your session expired. Sign in again." };
  const { error } = await supabase.from("whatsapp_links").update({ remind: on === true }).eq("user_id", user.id);
  if (error) return { ok: false, error: "Couldn't change reminders. Try again." };
  revalidatePath("/profile");
  return { ok: true };
}

export async function disconnectWhatsApp(): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Your session expired. Sign in again." };
  const { error } = await supabase.from("whatsapp_links").delete().eq("user_id", user.id);
  if (error) return { ok: false, error: "Couldn't disconnect. Try again." };
  revalidatePath("/profile");
  return { ok: true };
}
