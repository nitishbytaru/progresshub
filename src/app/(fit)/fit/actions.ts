"use server";

import { revalidatePath } from "next/cache";
import { getToday } from "@/lib/data";
import { validateDay } from "@/lib/fit";
import { isUnit, parseWeight } from "@/lib/fit-units";
import { createClient } from "@/lib/supabase/server";

export type WeightState = { error?: string; saved?: { day: string; kg: number; gym: boolean } } | null;

/** Saves the weight and gym check-in for the chosen day (today by default). Logging a day again replaces it. */
export async function logWeight(_: WeightState, formData: FormData): Promise<WeightState> {
  const rawUnit = formData.get("unit");
  const unit = isUnit(rawUnit) ? rawUnit : "kg";
  const parsed = parseWeight(String(formData.get("kg") ?? ""), unit);
  if ("error" in parsed) return { error: parsed.error };

  const [supabase, today] = await Promise.all([createClient(), getToday()]);
  const day = String(formData.get("day") ?? "") || today;
  const dayError = validateDay(day, today);
  if (dayError) return { error: dayError };

  const gym = formData.get("gym") === "on";

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Sign in again." };

  const { error } = await supabase
    .from("weight_logs")
    .upsert(
      { user_id: user.id, day, kg: parsed.kg, gym, updated_at: new Date().toISOString() },
      { onConflict: "user_id,day" },
    );
  if (error) {
    // 42P01 / PGRST205 = the weight_logs table isn't in the database yet.
    if (error.code === "42P01" || error.code === "PGRST205") return { error: "Weight logging isn't set up on the server yet." };
    return { error: "Couldn't save your weight. Try again in a moment." };
  }

  revalidatePath("/fit");
  return { saved: { day, kg: parsed.kg, gym } };
}
