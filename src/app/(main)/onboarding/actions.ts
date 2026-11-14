"use server";

import { redirect } from "next/navigation";
import { getToday } from "@/lib/data";
import { saveEntryFor } from "@/lib/entries";
import { clearPendingScore } from "@/lib/pending-score";
import { addDays } from "@/lib/progress";
import { createClient } from "@/lib/supabase/server";
import { parseImpressions, validateDisplayName, validateHandle } from "@/lib/validation";

export type OnboardingState = { error?: string; handle?: string; name?: string; total?: string } | null;

/**
 * Saves the X handle, name and the creator's verified total impressions (logged as today), then
 * sends them straight to the leaderboard to see where they stand. The tour is offered later.
 */

export async function completeOnboarding(_: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const { handle, error: handleError } = validateHandle(String(formData.get("handle") ?? ""));
  const { name, error: nameError } = validateDisplayName(String(formData.get("name") ?? ""));
  const totalText = String(formData.get("total") ?? "");
  const { value: total, error: totalError } = parseImpressions(totalText);
  if (handleError || nameError) return { error: handleError ?? nameError ?? undefined, handle, name, total: totalText };
  if (totalError || total === null) {
    return { error: totalError ?? "Enter your total impressions from X analytics.", handle, name, total: totalText };
  }
  const back = { handle, name, total: totalText };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("profiles").update({ handle, display_name: name }).eq("id", user.id);
  if (error) {
    if (error.code === "23505") return { error: `@${handle} is already on progresshub. Is that you? Sign in with that account instead.`, ...back };
    return { error: `Couldn't save your profile: ${error.message}`, ...back };
  }

  // Today's log, under the same rules as the log form. Before the handle reaches the login token,
  // so a bad number keeps the creator here to fix it.
  const today = await getToday();
  const saved = await saveEntryFor(supabase, user.id, today, total, addDays(today, 1));
  if (!saved.ok) return { error: saved.error, ...back };

  // Mirror the handle into auth metadata so the proxy can tell onboarding is done without a DB query.
  const { error: metaError } = await supabase.auth.updateUser({ data: { handle } });
  if (metaError) return { error: `Saved, but couldn't finish setup: ${metaError.message}. Try again.`, ...back };

  // The proxy reads the handle from the login token, and updateUser doesn't reissue that token.
  const { error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) return { error: `Saved, but couldn't finish setup: ${refreshError.message}. Try again.`, ...back };

  // The landing page's number (if any) only prefilled the field; it's been saved above.
  await clearPendingScore();
  redirect("/leaderboard#you");
}
