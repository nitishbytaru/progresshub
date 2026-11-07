import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "./supabase/server";
import { forecast, milestones, paceOver, streak, withDeltas, type Entry } from "./progress";

export type Profile = {
  id: string;
  handle: string | null;
  display_name: string;
  avatar_url: string | null;
  is_public: boolean;
};

export type LeaderRow = {
  user_id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  total: number;
  pace7: number;
  streak: number;
  last_logged_on: string;
  first_logged_on: string;
};

/** The viewer's calendar date (YYYY-MM-DD) in their own time zone, from the `tz` cookie. */
export const getToday = cache(async (): Promise<string> => {
  await connection(); // reads the clock
  const raw = (await cookies()).get("tz")?.value;
  const tz = raw ? decodeURIComponent(raw) : undefined;
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz || "UTC" }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
});

/** Signed-in user and profile. Redirects to /login if the session is gone (the proxy normally catches this). */
export const getViewer = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, handle, display_name, avatar_url, is_public")
    .eq("id", user.id)
    .single<Profile>();
  if (error || !profile) throw new Error(`Couldn't load your profile: ${error?.message ?? "not found"}`);
  return { user, profile };
});

export const getEntries = cache(async (userId: string): Promise<Entry[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("progress_entries")
    .select("entry_date, total")
    .eq("user_id", userId)
    .order("entry_date", { ascending: true });
  if (error) throw new Error(`Couldn't load your logs: ${error.message}`);
  return (data ?? []).map((r) => ({ date: r.entry_date as string, total: Number(r.total) }));
});

/** Everything a screen needs about the signed-in creator's progress. */
export const getProgress = cache(async () => {
  const [{ profile }, today] = await Promise.all([getViewer(), getToday()]);
  const entries = await getEntries(profile.id);
  const rows = withDeltas(entries);
  const latest = rows.at(-1) ?? null;
  const pace7 = paceOver(rows, 7);
  const pace28 = paceOver(rows, 28);
  return {
    profile,
    today,
    entries,
    rows,
    latest,
    previous: rows.at(-2) ?? null,
    pace7,
    pace28,
    eta: latest ? forecast(latest.total, pace7, latest.date) : null,
    etaSlow: latest ? forecast(latest.total, pace28, latest.date) : null,
    milestones: milestones(rows, pace7),
    streak: streak(rows, today),
  };
});

export type Progress = Awaited<ReturnType<typeof getProgress>>;

export const getLeaderboard = cache(async (): Promise<LeaderRow[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leaderboard")
    .select("user_id, handle, display_name, avatar_url, total, pace7, streak, last_logged_on, first_logged_on")
    .order("total", { ascending: false })
    .limit(500);
  if (error) throw new Error(`Couldn't load the leaderboard: ${error.message}`);
  return (data ?? []).map((r) => ({
    ...r,
    total: Number(r.total),
    pace7: Math.round(Number(r.pace7)),
    streak: Number(r.streak ?? 0),
  })) as LeaderRow[];
});
