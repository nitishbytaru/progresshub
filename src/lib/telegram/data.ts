import "server-only";
import { createHash } from "node:crypto";
import { createAdminClient } from "../supabase/admin";
import { forecast, paceOver, streak, withDeltas, type DayRow, type Forecast } from "../progress";
import type { ShareData } from "../share-cards";

/**
 * Everything the bot reads or writes, through the service-role client and always filtered to one
 * user_id. Self-contained (no Next request APIs) so the local polling script can use it too.
 */

export type Link = { user_id: string; chat_id: number; tz: string; remind: boolean };

export type Creator = ShareData & {
  userId: string;
  name: string;
  isPublic: boolean;
  pace7: number;
  eta: Forecast;
};

export const db = () => createAdminClient();

/** The site's public origin for links in messages. */
export const siteOrigin = () =>
  (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")
  ).replace(/\/$/, "");

/** YYYY-MM-DD in the creator's time zone (falls back to UTC for a bad zone). */
export function todayIn(tz: string) {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function getLinkByChat(chatId: number): Promise<Link | null> {
  const { data } = await db().from("telegram_links").select("user_id, chat_id, tz, remind").eq("chat_id", chatId).maybeSingle<Link>();
  return data ?? null;
}

/** Redeems a one-time connect code from the website. Returns the linked handle, or null if invalid/expired. */
export async function redeemLinkToken(token: string, chatId: number): Promise<{ handle: string | null } | null> {
  const client = db();
  const hash = hashToken(token);
  const { data: row } = await client
    .from("telegram_link_tokens")
    .select("user_id, tz, expires_at")
    .eq("token_hash", hash)
    .maybeSingle<{ user_id: string; tz: string; expires_at: string }>();
  if (!row || new Date(row.expires_at).getTime() < Date.now()) return null;

  // One chat per account and one account per chat: clear any older link for this chat first.
  await client.from("telegram_links").delete().eq("chat_id", chatId).neq("user_id", row.user_id);
  const { error } = await client
    .from("telegram_links")
    .upsert({ user_id: row.user_id, chat_id: chatId, tz: row.tz, linked_at: new Date().toISOString() }, { onConflict: "user_id" });
  await client.from("telegram_link_tokens").delete().eq("token_hash", hash);
  if (error) return null;

  const { data: profile } = await client.from("profiles").select("handle").eq("id", row.user_id).maybeSingle<{ handle: string | null }>();
  return { handle: profile?.handle ?? null };
}

export async function unlinkChat(chatId: number) {
  await db().from("telegram_links").delete().eq("chat_id", chatId);
}

/** Returns true the first time an update_id is seen (Telegram retries slow webhooks). */
export async function firstTimeSeen(updateId: number) {
  const { error } = await db().from("telegram_updates").insert({ update_id: updateId });
  return !error; // duplicate primary key → already handled
}

/** The creator's numbers, shaped like the website's (so share cards and stats match). */
export async function loadCreator(link: Link): Promise<Creator | null> {
  const client = db();
  const today = todayIn(link.tz);
  const [{ data: profile }, { data: entries }] = await Promise.all([
    client.from("profiles").select("handle, display_name, is_public").eq("id", link.user_id).maybeSingle<{ handle: string | null; display_name: string; is_public: boolean }>(),
    client.from("progress_entries").select("entry_date, total").eq("user_id", link.user_id).order("entry_date", { ascending: true }),
  ]);
  if (!profile) return null;

  const rows: DayRow[] = withDeltas((entries ?? []).map((r) => ({ date: r.entry_date as string, total: Number(r.total) })));
  const latest = rows.at(-1) ?? null;
  const pace7 = paceOver(rows, 7);
  return {
    userId: link.user_id,
    handle: profile.handle ?? "",
    name: profile.display_name || profile.handle || "you",
    isPublic: profile.is_public,
    rows,
    latest,
    streak: streak(rows, today),
    rank: latest ? await rankOf(link.user_id, latest.total) : null,
    pace7,
    eta: latest ? forecast(latest.total, pace7, latest.date) : null,
    today,
  };
}

async function rankOf(userId: string, total: number) {
  const client = db();
  const [{ count: ahead }, { count: of }, { data: me }] = await Promise.all([
    client.from("leaderboard").select("user_id", { count: "exact", head: true }).gt("total", total),
    client.from("leaderboard").select("user_id", { count: "exact", head: true }),
    client.from("leaderboard").select("user_id").eq("user_id", userId).maybeSingle(),
  ]);
  return me ? { rank: (ahead ?? 0) + 1, of: of ?? 1 } : null;
}
