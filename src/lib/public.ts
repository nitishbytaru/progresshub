import "server-only";
import { createClient as createSupabase } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { connection } from "next/server";
import { cache } from "react";
import { SUPABASE_KEY, SUPABASE_URL } from "./supabase/env";
import { forecast, paceOver, streak, withDeltas, type Entry } from "./progress";

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

/** Rank by total impressions (1 = closest to 500K) and how many creators are on the board. */
export const getRank = cache(async (userId: string) => {
  await connection();
  const db = anon();
  const { data: me } = await db.from("leaderboard").select("total").eq("user_id", userId).maybeSingle();
  if (!me) return null;
  const [{ count: ahead }, { count: of }] = await Promise.all([
    db.from("leaderboard").select("user_id", { count: "exact", head: true }).gt("total", me.total),
    db.from("leaderboard").select("user_id", { count: "exact", head: true }),
  ]);
  return { rank: (ahead ?? 0) + 1, of: of ?? 1 };
});

/** Where a total not yet on the board would rank, counting that visitor in the size of the board. */
export async function getRankForTotal(total: number) {
  await connection();
  const db = anon();
  const [ahead, board] = await Promise.all([
    db.from("leaderboard").select("user_id", { count: "exact", head: true }).gt("total", total),
    db.from("leaderboard").select("user_id", { count: "exact", head: true }),
  ]);
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
 * Public site origin for share links, e.g. https://progresshub24.vercel.app.
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


/** Share image for a 500K deadline; `v` changes with the latest log so X never shows stale numbers. */
export const targetCardPath = (handle: string, target: string, latest: { date: string; total: number }) =>
  `/u/${handle}/target-card?d=${target}&v=${encodeURIComponent(`${latest.date}-${latest.total}`)}`;
