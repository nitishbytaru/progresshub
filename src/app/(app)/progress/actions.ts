"use server";

import { revalidatePath } from "next/cache";
import { getToday } from "@/lib/data";
import { addDays } from "@/lib/progress";
import { createClient } from "@/lib/supabase/server";
import { saveEntryFor, type SaveResult } from "@/lib/entries";

export type { SaveResult };

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
  const result = await saveEntryFor(supabase, user.id, date, total, today);
  if (!result.ok) return result;

  revalidatePath("/", "layout");
  return result;
}
