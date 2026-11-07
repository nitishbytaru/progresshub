"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type OnboardingState = { error?: string; handle?: string; name?: string } | null;

export async function completeOnboarding(_: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const handle = String(formData.get("handle") ?? "").trim().replace(/^@/, "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 50);

  if (!/^[A-Za-z0-9_]{1,15}$/.test(handle)) {
    return { error: "X handles are 1–15 letters, numbers or underscores.", handle, name };
  }
  if (!name) return { error: "Add the name you want on the leaderboard.", handle, name };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("profiles").update({ handle, display_name: name }).eq("id", user.id);
  if (error) {
    if (error.code === "23505") return { error: `@${handle} is already on progresshub. Is that you? Sign in with that account instead.`, handle, name };
    return { error: `Couldn't save your profile: ${error.message}`, handle, name };
  }

  // Mirror the handle into auth metadata so the proxy can tell onboarding is done without a DB query.
  const { error: metaError } = await supabase.auth.updateUser({ data: { handle } });
  if (metaError) return { error: `Saved, but couldn't finish setup: ${metaError.message}. Try again.`, handle, name };

  redirect("/progress");
}
