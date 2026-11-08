"use server";

import { createClient } from "@/lib/supabase/server";

/** Remembers on the account that the tutorial has been finished or skipped. */
export async function finishTutorial() {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ data: { tutorial_done: true } });
  if (error) return;
  // The check reads the login token, and updateUser doesn't reissue that token.
  await supabase.auth.refreshSession();
}
