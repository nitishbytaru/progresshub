"use server";

import { rememberPendingScore } from "@/lib/pending-score";
import { getRankForTotal } from "@/lib/public";
import { parseImpressions, validateEntry } from "@/lib/validation";

export type ScoreResult = { ok: true; total: number; rank: number; of: number } | { ok: false; error: string };

/** Ranks a signed-out visitor's number against the board and keeps it for after login. */
export async function checkScore(input: unknown): Promise<ScoreResult> {
  if (typeof input !== "string") return { ok: false, error: "Enter your impressions." };
  const { value, error } = parseImpressions(input);
  if (error) return { ok: false, error };

  // No earlier logs to compare with yet, so only the number's own limits apply.
  const today = new Date().toISOString().slice(0, 10);
  const problem = validateEntry({ date: today, total: value, today, before: null, after: null });
  if (problem || value === null) return { ok: false, error: problem ?? "Enter your impressions." };

  const position = await getRankForTotal(value);
  if (!position) return { ok: false, error: "Couldn't load the leaderboard. Try again in a moment." };

  await rememberPendingScore(value);
  return { ok: true, total: value, ...position };
}
