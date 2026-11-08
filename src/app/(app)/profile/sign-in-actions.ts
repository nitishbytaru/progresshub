"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateNewPassword } from "@/lib/validation";

export type PasswordState = { error?: string; message?: string } | null;

/**
 * Sets (or changes) the password on the signed-in account, so a creator who joined with Google
 * can also sign in with their account email + password. Marks `has_password` in metadata because
 * Supabase doesn't expose whether a Google-only user has one.
 */
export async function setPassword(_: PasswordState, formData: FormData): Promise<PasswordState> {
  const password = String(formData.get("password") ?? "");
  const problem = validateNewPassword(password);
  if (problem) return { error: problem };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Sign in again." };

  const { error } = await supabase.auth.updateUser({ password, data: { has_password: true } });
  if (error) {
    if (error.code === "same_password") return { error: "That's already your password." };
    if (error.code === "weak_password") return { error: "Pick a stronger password: longer, with letters and numbers." };
    if (error.code === "reauthentication_needed" || error.code === "reauthentication_not_valid") {
      return { error: "For security, sign out and use “Forgot password?” on the login page to set it." };
    }
    return { error: "Couldn't save your password. Try again in a moment." };
  }

  revalidatePath("/profile");
  return { message: `Password saved. You can now sign in with ${user.email} and this password.` };
}
