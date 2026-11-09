import "server-only";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getToday } from "./data";
import { saveEntryFor } from "./entries";
import { addDays } from "./progress";
import { createClient } from "./supabase/server";

const COOKIE = "pending_score";
const MAX_AGE_SECONDS = 60 * 60 * 24;

/** Login's `next` target that adds the number from the landing page's score check. */
export const CLAIM_PATH = "/claim";

/** Holds the signed-out visitor's number until they log in. */
export async function rememberPendingScore(total: number) {
  (await cookies()).set(COOKIE, String(total), {
    path: "/",
    maxAge: MAX_AGE_SECONDS,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function hasPendingScore() {
  return (await cookies()).has(COOKIE);
}

/**
 * Logs the pending number as today's total, under the same rules as the log form, and returns
 * where to go next. Creators without an X handle finish onboarding first, which calls this again.
 */
export async function finishScoreClaim(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "/login";
  if (!user.user_metadata?.handle) return "/onboarding";

  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return "/share";
  store.delete(COOKIE);

  const today = await getToday();
  const result = await saveEntryFor(supabase, user.id, today, Number(raw), addDays(today, 1));
  if (!result.ok) return "/share?score=skipped";
  revalidatePath("/", "layout");
  return "/share?score=saved";
}
