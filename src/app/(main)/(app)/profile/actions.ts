"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateHandle } from "@/lib/validation";

export type ProfileState = { error?: string; message?: string; value?: string } | null;

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
