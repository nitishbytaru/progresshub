import "server-only";
import { createClient as createSupabase } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { connection } from "next/server";
import { cache } from "react";
import { SUPABASE_KEY, SUPABASE_URL } from "./supabase/env";
import { forecast, GOAL, paceOver, streak, withDeltas, type Entry } from "./progress";

/** Cookie-less client: reads only what the database already exposes to everyone (public profiles). */
const anon = () =>
  createSupabase(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

export type PublicProfile = { id: string; handle: string; display_name: string; avatar_url: string | null };

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export const getPublicProfile = cache(async (handle: string): Promise<PublicProfile | null> => {
  await connection(); // live data + clock reads below: request-time only
  if (!/^[A-Za-z0-9_]{1,15}$/.test(handle)) return null;
  const { data } = await anon()
    .from("profiles")
    .select("id, handle, display_name, avatar_url")
    .ilike("handle", escapeLike(handle))
    .eq("is_public", true)
    .maybeSingle<PublicProfile>();
  return data ?? null;
});

/**
 * Rank by total impressions (1 = closest to 500K) among creators still racing. Anyone at 500K has
 * finished the race: they leave the ranking (null here) and show up in the finishers list instead.
 */
export const getRank = cache(async (userId: string) => {
  await connection();
  const db = anon();
  const { data: me } = await db.from("leaderboard").select("total").eq("user_id", userId).maybeSingle();
  if (!me || Number(me.total) >= GOAL) return null;
  const racing = () => db.from("leaderboard").select("user_id", { count: "exact", head: true }).lt("total", GOAL);
  const [{ count: ahead }, { count: of }, above, below] = await Promise.all([
    racing().gt("total", me.total),
    racing(),
    // The nearest totals just above and below, for "+3.1K to #1" / "leads by 2K".
    db.from("leaderboard").select("total").gt("total", me.total).lt("total", GOAL).order("total", { ascending: true }).limit(1).maybeSingle(),
    db.from("leaderboard").select("total").lt("total", me.total).order("total", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const mine = Number(me.total);
  return {
    rank: (ahead ?? 0) + 1,
    of: of ?? 1,
    /** Impressions needed to pass the creator one place up (null at #1). */
    toNext: above.data ? Number(above.data.total) - mine : null,
    /** Lead over the creator one place down (null in last place). */
    lead: below.data ? mine - Number(below.data.total) : null,
  };
});

/**
 * The creators racing nearest someone on the board (closest places first, then shown top-down),
 * for the share card's "Racing with" panel, plus how many are racing. Finishers aren't racing.
 */
export const getRacers = cache(async (userId: string, limit = 8) => {
  const { data } = await anon()
    .from("leaderboard")
    .select("user_id, handle, avatar_url, total")
    .lt("total", GOAL)
    .order("total", { ascending: false })
    .limit(500);
  const board = (data ?? []) as { user_id: string; handle: string; avatar_url: string | null; total: number }[];
  const me = board.findIndex((r) => r.user_id === userId);
  const racers = board
    .map((r, i) => ({ r, i, gap: me < 0 ? i : Math.abs(i - me) }))
    .filter(({ r }) => r.user_id !== userId)
    .sort((x, y) => x.gap - y.gap)
    .slice(0, limit)
    .sort((x, y) => x.i - y.i)
    .map(({ r }) => ({ handle: r.handle, avatarUrl: r.avatar_url }));
  return { racers, racing: board.length };
});

/** Where a total not yet on the board would rank, counting that visitor in the size of the board. */
export async function getRankForTotal(total: number) {
  await connection();
  const db = anon();
  const racing = () => db.from("leaderboard").select("user_id", { count: "exact", head: true }).lt("total", GOAL);
  const [ahead, board] = await Promise.all([racing().gt("total", total), racing()]);
  if (ahead.error || board.error) return null;
  return { rank: (ahead.count ?? 0) + 1, of: (board.count ?? 0) + 1 };
}

/** Public progress for a creator page or share image. */
export const getPublicProgress = cache(async (handle: string) => {
  const profile = await getPublicProfile(handle);
  if (!profile) return null;
  const { data } = await anon()
    .from("progress_entries")
    .select("entry_date, total")
    .eq("user_id", profile.id)
    .order("entry_date", { ascending: true });
  const entries: Entry[] = (data ?? []).map((r) => ({ date: r.entry_date as string, total: Number(r.total) }));
  const rows = withDeltas(entries);
  const latest = rows.at(-1) ?? null;
  const today = new Date().toISOString().slice(0, 10);
  const pace7 = paceOver(rows, 7);
  return {
    profile,
    rows,
    latest,
    pace7,
    eta: latest ? forecast(latest.total, pace7, latest.date) : null,
    streak: streak(rows, today),
    rank: await getRank(profile.id),
  };
});

/**
 * Public site origin for share links, e.g. https://progresshub.space.
 * Prefers the configured / production URL (like metadataBase in app/layout.tsx), so links shared
 * from a preview deploy still point at the live site X can crawl; falls back to the request's host.
 */
export async function getOrigin() {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null);
  if (configured) return configured.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Changes whenever anything printed on the share card changes; used to bust image caches. */
export function cardVersion(d: {
  latest: { date: string; total: number } | null;
  streak: number;
  rank: { rank: number; of: number } | null;
}) {
  return [d.latest?.date ?? "none", d.latest?.total ?? 0, d.streak, d.rank?.rank ?? 0, d.rank?.of ?? 0].join("-");
}

export const cardPath = (handle: string, version: string) => `/u/${handle}/card?v=${encodeURIComponent(version)}`;

