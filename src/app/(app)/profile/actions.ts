"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getOrigin } from "@/lib/public";
import { createClient } from "@/lib/supabase/server";
import { validateEmail, validateHandle } from "@/lib/validation";

export type ProfileState = { error?: string; message?: string; value?: string } | null;

/** Starts an email change. Supabase only switches it after the creator clicks the link sent to the new address. */
export async function updateEmail(_: ProfileState, formData: FormData): Promise<ProfileState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const problem = validateEmail(email);
  if (problem) return { error: problem, value: email };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Sign in again.", value: email };
  if (email === user.email?.toLowerCase()) return { error: "That's already your email.", value: email };

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? (await getOrigin());
  // The confirm link lands on /auth/callback, which sends the creator back here.
  (await cookies()).set("auth_next", "/profile", { path: "/", maxAge: 60 * 60, sameSite: "lax", httpOnly: true });
  const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: `${origin}/auth/callback` });
  if (error) {
    if (/already/i.test(error.message)) return { error: "Another account already uses that email.", value: email };
    if (/rate|seconds/i.test(error.message)) return { error: "Too many tries. Wait a minute, then try again.", value: email };
    return { error: "Couldn't change your email. Try again in a moment.", value: email };
  }
  return { message: `Check ${email} and click the link to confirm. Your email changes after that.`, value: email };
}

/** Changes the X handle: profile row (public page, leaderboard) and auth metadata (used by the proxy). */
export async function updateHandle(_: ProfileState, formData: FormData): Promise<ProfileState> {
  const { handle, error: problem } = validateHandle(String(formData.get("handle") ?? ""));
  if (problem) return { error: problem, value: handle };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Sign in again.", value: handle };

  const { error } = await supabase.from("profiles").update({ handle }).eq("id", user.id);
  if (error) {
    if (error.code === "23505") return { error: `@${handle} is already taken on progresshub.`, value: handle };
    return { error: "Couldn't save your username. Try again in a moment.", value: handle };
  }
  const { error: metaError } = await supabase.auth.updateUser({ data: { handle } });
  if (metaError) return { error: "Saved, but couldn't finish the update. Try again.", value: handle };

  revalidatePath("/", "layout");
  return { message: `Saved. Your public page is now /u/${handle}.`, value: handle };
}
