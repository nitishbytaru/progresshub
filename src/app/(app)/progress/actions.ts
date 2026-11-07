"use server";

import { revalidatePath } from "next/cache";
import { getToday } from "@/lib/data";
import { addDays } from "@/lib/progress";
import { createClient } from "@/lib/supabase/server";
import { validateDate, validateEntry } from "@/lib/validation";

export type SaveResult = { ok: true; created: boolean } | { ok: false; error: string };

/**
 * Upserts the signed-in creator's cumulative total for one day. Runs the same rules as the form
 * (lib/validation.ts) against the database's neighbouring logs, so a crafted request can't skip them.
 */
export async function saveEntry(date: unknown, total: unknown): Promise<SaveResult> {
  if (typeof date !== "string" || typeof total !== "number") return { ok: false, error: "Pick a day and enter a number." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Your session expired. Sign in again." };

  // "Today" comes from the viewer's time zone cookie; one day of slack covers a stale or missing cookie.
  const today = addDays(await getToday(), 1);
  const dateProblem = validateDate(date, today);
  if (dateProblem) return { ok: false, error: dateProblem };

  const [before, after, existing] = await Promise.all([
    supabase.from("progress_entries").select("entry_date, total").eq("user_id", user.id).lt("entry_date", date).order("entry_date", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("progress_entries").select("entry_date, total").eq("user_id", user.id).gt("entry_date", date).order("entry_date", { ascending: true }).limit(1).maybeSingle(),
    supabase.from("progress_entries").select("id").eq("user_id", user.id).eq("entry_date", date).maybeSingle(),
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
    .upsert({ user_id: user.id, entry_date: date, total }, { onConflict: "user_id,entry_date" });
  if (error) {
    if (error.code === "23514") return { ok: false, error: "That number is outside what progresshub accepts. Check it and try again." };
    return { ok: false, error: "Couldn't save your log. Check your connection and try again." };
  }

  revalidatePath("/", "layout");
  return { ok: true, created: !existing.data };
}
