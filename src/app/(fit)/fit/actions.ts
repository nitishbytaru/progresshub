"use server";

import { revalidatePath } from "next/cache";
import { getToday } from "@/lib/data";
import { validateDay } from "@/lib/fit";
import { MUSCLES, isMuscle, isUnit, parseWeight, type Muscle } from "@/lib/fit-units";
import { createClient } from "@/lib/supabase/server";

export type WeightState = { error?: string; saved?: { day: string; kg: number; gym: boolean; muscles: Muscle[] } } | null;

/** Saves the weight, gym check-in and trained muscles for the chosen day (today by default). Logging a day again replaces it. */
export async function logWeight(_: WeightState, formData: FormData): Promise<WeightState> {
  const rawUnit = formData.get("unit");
  const unit = isUnit(rawUnit) ? rawUnit : "kg";
  const rawKg = String(formData.get("kg") ?? "").trim();

  const [supabase, today] = await Promise.all([createClient(), getToday()]);
  const day = String(formData.get("day") ?? "") || today;
  const dayError = validateDay(day, today);
  if (dayError) return { error: dayError };
  const gym = formData.get("gym") === "on";
  // Muscles only count on a gym day; kept in a fixed order.
  const picked = new Set(formData.getAll("muscle").filter(isMuscle));
  const muscles = gym ? MUSCLES.filter((m) => picked.has(m)) : [];

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Sign in again." };

  // No weight typed: keep the day's stored kg untouched (no unit round-trip) and only update gym.
  if (!rawKg) {
    const { data, error } = await supabase
      .from("weight_logs")
      .update({ gym, muscles, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("day", day)
      .select("kg")
      .maybeSingle();
    if (error) return { error: "Couldn't save. Try again in a moment." };
    if (!data) return { error: `Enter your weight in ${unit}.` };
    revalidatePath("/fit", "layout");
    return { saved: { day, kg: Number(data.kg), gym, muscles } };
  }

  const parsed = parseWeight(rawKg, unit);
  if ("error" in parsed) return { error: parsed.error };

  const { error } = await supabase
    .from("weight_logs")
    .upsert(
      { user_id: user.id, day, kg: parsed.kg, gym, muscles, updated_at: new Date().toISOString() },
      { onConflict: "user_id,day" },
    );
  if (error) {
    // 42P01 / PGRST205 = the weight_logs table isn't in the database yet.
    if (error.code === "42P01" || error.code === "PGRST205") return { error: "Weight logging isn't set up on the server yet." };
    return { error: "Couldn't save your weight. Try again in a moment." };
  }

  revalidatePath("/fit", "layout");
  return { saved: { day, kg: parsed.kg, gym, muscles } };
}
