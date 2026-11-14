"use server";

import { revalidatePath } from "next/cache";
import { getToday } from "@/lib/data";
import { KG_PER_LB, isUnit } from "@/lib/fit-units";
import { createClient } from "@/lib/supabase/server";

export type ProfileState = { error?: string; saved?: boolean } | null;

const SEX = ["male", "female"];
const ACTIVITY = ["sedentary", "light", "moderate", "active", "very_active"];
const GOAL = ["lose", "maintain", "gain"];
const DIET = ["vegan", "veg", "egg", "nonveg"];

/** Creates or updates the fit profile behind calorie targets, meal plans and the weekly plan. */
export async function saveProfile(_: ProfileState, formData: FormData): Promise<ProfileState> {
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const n = (k: string) => Number(get(k).replace(",", "."));
  const today = await getToday();
  const year = Number(today.slice(0, 4));

  const sex = get("sex");
  const activity = get("activity");
  const goal = get("goal");
  const diet = get("diet");
  const unit = isUnit(get("unit")) ? get("unit") : "kg";
  const birth = n("birth_year");
  const height = n("height_cm");
  const rawTarget = get("target");
  const target = rawTarget ? n("target") * (unit === "lb" ? KG_PER_LB : 1) : null;
  const rate = n("weekly_rate_kg");
  const gymDays = n("gym_days_target");
  const water = n("water_target_l") * 1000;

  if (!SEX.includes(sex)) return { error: "Pick male or female (used for the calorie formula)." };
  if (!Number.isInteger(birth) || birth < year - 100 || birth > year - 12) return { error: `Enter a birth year between ${year - 100} and ${year - 12}.` };
  if (!(height >= 100 && height <= 250)) return { error: "Enter your height in cm (100–250)." };
  if (!ACTIVITY.includes(activity)) return { error: "Pick an activity level." };
  if (!GOAL.includes(goal)) return { error: "Pick a goal." };
  if (target !== null && !(target >= 20 && target <= 400)) return { error: "Target weight must be between 20 and 400 kg." };
  if (!(rate >= 0 && rate <= 1.5)) return { error: "Weekly rate must be between 0 and 1.5 kg." };
  if (!DIET.includes(diet)) return { error: "Pick a diet type." };
  if (!Number.isInteger(gymDays) || gymDays < 0 || gymDays > 7) return { error: "Gym days per week must be 0–7." };
  if (!(water >= 500 && water <= 8000)) return { error: "Water target must be 0.5–8 L." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Sign in again." };

  const { error } = await supabase.from("fit_profiles").upsert({
    user_id: user.id,
    sex,
    birth_year: birth,
    height_cm: Math.round(height * 10) / 10,
    activity,
    goal,
    target_kg: target === null ? null : Math.round(target * 100) / 100,
    weekly_rate_kg: goal === "maintain" ? 0 : rate,
    diet,
    gym_days_target: gymDays,
    water_target_ml: Math.round(water),
    updated_at: new Date().toISOString(),
  });
  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") return { error: "Profiles aren't set up on the server yet." };
    return { error: "Couldn't save your profile. Try again in a moment." };
  }
  revalidatePath("/fit", "layout");
  return { saved: true };
}
