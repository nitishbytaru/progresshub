"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

export async function voteForWhatsApp(): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Your session expired. Sign in again." };

  const { error } = await supabase.from("whatsapp_votes").upsert({ user_id: user.id }, { onConflict: "user_id", ignoreDuplicates: true });
  if (error) return { ok: false, error: "Couldn't save your vote. Try again in a moment." };
  revalidatePath("/profile");
  return { ok: true };
}
