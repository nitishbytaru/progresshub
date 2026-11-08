"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { validateDisplayName, validateHandle } from "@/lib/validation";

export type OnboardingState = { error?: string; handle?: string; name?: string } | null;

export async function completeOnboarding(_: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const { handle, error: handleError } = validateHandle(String(formData.get("handle") ?? ""));
  const { name, error: nameError } = validateDisplayName(String(formData.get("name") ?? ""));
  if (handleError || nameError) return { error: handleError ?? nameError ?? undefined, handle, name };

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

  // The proxy reads the handle from the login token, and updateUser doesn't reissue that token.
  const { error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) return { error: `Saved, but couldn't finish setup: ${refreshError.message}. Try again.`, handle, name };

  redirect("/progress");
}
