import type { SupabaseClient } from "@supabase/supabase-js";
import { validateDate, validateEntry } from "./validation";

export type SaveResult = { ok: true; created: boolean } | { ok: false; error: string };

/**
 * Upserts one creator's cumulative total for a day, after the same rules as the log form
 * (lib/validation.ts) against their neighbouring logs in the database. Shared by the website's
 * server action (user-scoped client) and the Telegram bot (service-role client), so both enforce
 * identical rules. `today` is the latest day the caller accepts.
 */
export async function saveEntryFor(
  supabase: SupabaseClient,
  userId: string,
  date: string,
  total: number,
  today: string,
): Promise<SaveResult> {
  const dateProblem = validateDate(date, today);
  if (dateProblem) return { ok: false, error: dateProblem };

  const [before, after, existing] = await Promise.all([
    supabase.from("progress_entries").select("entry_date, total").eq("user_id", userId).lt("entry_date", date).order("entry_date", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("progress_entries").select("entry_date, total").eq("user_id", userId).gt("entry_date", date).order("entry_date", { ascending: true }).limit(1).maybeSingle(),
    supabase.from("progress_entries").select("id").eq("user_id", userId).eq("entry_date", date).maybeSingle(),
  ]);
  if (before.error || after.error || existing.error) {
    return { ok: false, error: "Couldn't check your other logs. Try again in a moment." };
  }

  const toEntry = (r: { entry_date: string; total: number } | null) =>
    r ? { date: r.entry_date, total: Number(r.total) } : null;
  const problem = validateEntry({ date, total, today, before: toEntry(before.data), after: toEntry(after.data) });
  if (problem) return { ok: false, error: problem };

  const { error } = await supabase
    .from("progress_entries")
    .upsert({ user_id: userId, entry_date: date, total }, { onConflict: "user_id,entry_date" });
  if (error) {
    if (error.code === "23514") return { ok: false, error: "That number is outside what progresshub accepts. Check it and try again." };
    return { ok: false, error: "Couldn't save your log. Check your connection and try again." };
  }
  return { ok: true, created: !existing.data };
}
