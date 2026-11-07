import "server-only";
import { createClient as createSupabase } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { cache } from "react";
import { SUPABASE_KEY, SUPABASE_URL } from "./supabase/env";
import { forecast, paceOver, streak, withDeltas, type Entry } from "./progress";

/** Cookie-less client: reads only what the database already exposes to everyone (public profiles). */
const anon = () =>
  createSupabase(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

export type PublicProfile = { id: string; handle: string; display_name: string; avatar_url: string | null };

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export const getPublicProfile = cache(async (handle: string): Promise<PublicProfile | null> => {
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
  const db = anon();
  const { data: me } = await db.from("leaderboard").select("total").eq("user_id", userId).maybeSingle();
  if (!me) return null;
  const [{ count: ahead }, { count: of }] = await Promise.all([
    db.from("leaderboard").select("user_id", { count: "exact", head: true }).gt("total", me.total),
    db.from("leaderboard").select("user_id", { count: "exact", head: true }),
  ]);
  return { rank: (ahead ?? 0) + 1, of: of ?? 1 };
});

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

/** Absolute origin of the current request, e.g. https://progresshub24.vercel.app */
export async function getOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
