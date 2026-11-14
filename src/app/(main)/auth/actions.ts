"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DELETE_CONFIRM_WORD } from "@/lib/validation";

export type AuthState = { error?: string; message?: string } | null;

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * Permanently deletes the signed-in creator: auth user, profile and every log
 * (see supabase/migrations/20261109000000_delete_account.sql), then clears the session cookies.
 */
export async function deleteAccount(_: AuthState, formData: FormData): Promise<AuthState> {
  if (String(formData.get("confirm") ?? "").trim().toLowerCase() !== DELETE_CONFIRM_WORD) {
    return { error: `Type ${DELETE_CONFIRM_WORD} to confirm.` };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Sign in again, then delete your account." };

  const { error } = await supabase.rpc("delete_my_account");
  if (error) {
    // PGRST202 = the function isn't in the database yet (migration not applied).
    if (error.code === "PGRST202") return { error: "Account deletion isn't set up on the server yet. Try again later." };
    return { error: "Couldn't delete your account. Nothing was removed. Try again in a moment." };
  }

  // The user row is gone, so this only clears the local session cookies.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login?deleted=1");
}
