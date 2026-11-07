"use server";

import { revalidatePath } from "next/cache";
import { getToday } from "@/lib/data";
import { fmt } from "@/lib/format";
import { addDays, toUTC } from "@/lib/progress";
import { createClient } from "@/lib/supabase/server";

export type SaveResult = { ok: true; created: boolean } | { ok: false; error: string };

/** Upserts the signed-in creator's cumulative total for one day, keeping totals non-decreasing over time. */
export async function saveEntry(date: string, total: number): Promise<SaveResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(toUTC(date))) return { ok: false, error: "Pick a valid day." };
  if (!Number.isSafeInteger(total) || total < 0 || total > 1_000_000_000_000) {
    return { ok: false, error: "Enter a whole number of impressions." };
  }
  // Allow one day of slack for time zones ahead of the server's view of "today".
  if (toUTC(date) > toUTC(addDays(await getToday(), 1))) return { ok: false, error: "You can't log a day that hasn't happened yet." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Your session expired. Sign in again." };

  const [before, after, existing] = await Promise.all([
    supabase.from("progress_entries").select("entry_date, total").eq("user_id", user.id).lt("entry_date", date).order("entry_date", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("progress_entries").select("entry_date, total").eq("user_id", user.id).gt("entry_date", date).order("entry_date", { ascending: true }).limit(1).maybeSingle(),
    supabase.from("progress_entries").select("id").eq("user_id", user.id).eq("entry_date", date).maybeSingle(),
  ]);
  if (before.data && total < Number(before.data.total)) {
    return { ok: false, error: `That's lower than your ${before.data.entry_date} total of ${fmt(Number(before.data.total))}.` };
  }
  if (after.data && total > Number(after.data.total)) {
    return { ok: false, error: `That's higher than your ${after.data.entry_date} total of ${fmt(Number(after.data.total))}.` };
  }

  const { error } = await supabase
    .from("progress_entries")
    .upsert({ user_id: user.id, entry_date: date, total }, { onConflict: "user_id,entry_date" });
  if (error) return { ok: false, error: `Couldn't save: ${error.message}` };

  revalidatePath("/", "layout");
  return { ok: true, created: !existing.data };
}
