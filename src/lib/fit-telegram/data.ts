import "server-only";
import { createAdminClient } from "../supabase/admin";
import { hashToken, todayIn } from "../telegram/data";
import { FOOD_BY_KEY, type CoreMeal } from "../fit-foods";
import type { ParsedFood } from "../fit-ai";
import { MUSCLES, isMuscle, type Muscle, type Unit } from "../fit-units";
import { targets, type FitProfile } from "../fit-nutrition";
import { addDays } from "../progress";

/**
 * Everything the fit bot reads or writes, through the service-role client and always filtered to
 * the linked user_id. No Next request APIs, so the local polling script can use it too.
 */

export type FitLink = { user_id: string; chat_id: number; tz: string };

export const db = () => createAdminClient();
export { todayIn };

/** The fit site's public origin for links in messages. */
export const fitOrigin = () => (process.env.NEXT_PUBLIC_FIT_URL ?? "http://fit.localhost:3000").replace(/\/$/, "");

/** Same daily AI cap as the Add-food dialog's Describe tab. */
export const MEAL_AI_CAP = 40;

export async function getFitLink(chatId: number): Promise<FitLink | null> {
  const { data } = await db().from("fit_telegram_links").select("user_id, chat_id, tz").eq("chat_id", chatId).maybeSingle<FitLink>();
  return data ?? null;
}

/** Redeems a one-time connect code from the fit site. True when the chat is now linked. */
export async function redeemFitToken(token: string, chatId: number): Promise<boolean> {
  const client = db();
  const hash = hashToken(token);
  const { data: row } = await client
    .from("fit_telegram_link_tokens")
    .select("user_id, tz, expires_at")
    .eq("token_hash", hash)
    .maybeSingle<{ user_id: string; tz: string; expires_at: string }>();
  if (!row || new Date(row.expires_at).getTime() < Date.now()) return false;
  // One chat per account and one account per chat.
  await client.from("fit_telegram_links").delete().eq("chat_id", chatId).neq("user_id", row.user_id);
  const { error } = await client
    .from("fit_telegram_links")
    .upsert({ user_id: row.user_id, chat_id: chatId, tz: row.tz, linked_at: new Date().toISOString() }, { onConflict: "user_id" });
  await client.from("fit_telegram_link_tokens").delete().eq("token_hash", hash);
  return !error;
}

export async function unlinkFitChat(chatId: number) {
  await db().from("fit_telegram_links").delete().eq("chat_id", chatId);
}

/** True the first time an update_id is seen (Telegram retries slow webhooks). */
export async function firstTimeSeenFit(updateId: number) {
  const { error } = await db().from("fit_telegram_updates").insert({ update_id: updateId });
  return !error;
}

/** Same window as the website: no future days, at most 365 days back. */
export function checkDay(day: string, today: string): string | null {
  if (day > today) return "That day hasn't happened yet.";
  if (day < addDays(today, -365)) return "You can only log the last 365 days.";
  return null;
}

// ---- Pending confirmations (button data is limited to 64 bytes, so the payload waits here).
/**
 * A step waiting for the user. Anything they didn't say stays null (unit, meal, `dayGiven`), and the
 * bot asks for it with buttons before anything is saved; it never fills those in by itself.
 */
export type Pending =
  | { kind: "weight"; day: string; dayGiven: boolean; value: number; unit: Unit | null }
  | { kind: "gym"; day: string; dayGiven: boolean; gym: boolean; muscles: Muscle[]; forgot: boolean }
  | { kind: "food"; day: string; dayGiven: boolean; meal: CoreMeal | null; items: ParsedFood[] }
  /** Food with no amounts: waiting for "use usual portions" (or the user resends with amounts). */
  | { kind: "foodtext"; day: string; dayGiven: boolean; meal: CoreMeal | null; text: string };

export async function putPending(userId: string, payload: Pending): Promise<string | null> {
  const client = db();
  // Keep the table small: drop this user's expired rows.
  await client.from("fit_telegram_pending").delete().eq("user_id", userId).lt("expires_at", new Date().toISOString());
  const { data, error } = await client.from("fit_telegram_pending").insert({ user_id: userId, payload }).select("id").single();
  return error ? null : (data.id as string);
}

export async function getPending(userId: string, id: string): Promise<Pending | null> {
  const { data } = await db()
    .from("fit_telegram_pending")
    .select("payload, expires_at")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle<{ payload: Pending; expires_at: string }>();
  if (!data || new Date(data.expires_at).getTime() < Date.now()) return null;
  return data.payload;
}

export async function updatePending(userId: string, id: string, payload: Pending) {
  await db().from("fit_telegram_pending").update({ payload }).eq("id", id).eq("user_id", userId);
}

export async function dropPending(userId: string, id: string) {
  await db().from("fit_telegram_pending").delete().eq("id", id).eq("user_id", userId);
}

// ---- Writes (same rules as the website's server actions).
type Result = { ok: true } | { ok: false; error: string };

/** Weigh-in for a day; keeps that day's gym check-in and muscles if it already had one. */
export async function saveWeight(userId: string, day: string, kg: number): Promise<Result> {
  const client = db();
  const { data: existing } = await client.from("weight_logs").select("gym, muscles").eq("user_id", userId).eq("day", day).maybeSingle();
  const { error } = await client.from("weight_logs").upsert(
    { user_id: userId, day, kg, gym: existing?.gym ?? false, muscles: existing?.muscles ?? [], updated_at: new Date().toISOString() },
    { onConflict: "user_id,day" },
  );
  return error ? { ok: false, error: "Couldn't save your weight. Try again in a moment." } : { ok: true };
}

/** Gym or rest day. Needs that day's weigh-in first (the website stores both on one row). */
export async function saveGym(userId: string, day: string, gym: boolean, muscles: Muscle[]): Promise<Result> {
  const clean = gym ? MUSCLES.filter((m) => muscles.includes(m)) : [];
  const { data, error } = await db()
    .from("weight_logs")
    .update({ gym, muscles: clean, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("day", day)
    .select("day")
    .maybeSingle();
  if (error) return { ok: false, error: "Couldn't save. Try again in a moment." };
  if (!data) return { ok: false, error: "NO_WEIGHT" };
  return { ok: true };
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Confirmed AI items. Built-in matches are re-priced from our list; others are clamped. */
export async function saveFood(userId: string, day: string, meal: CoreMeal, items: ParsedFood[]): Promise<Result> {
  const clamp = (v: unknown, max: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(0, v)) : 0);
  const rows = items.slice(0, 10).map((i) => {
    const servings = Math.min(20, Math.max(0.25, clamp(i.servings, 20) || 1));
    const food = i.key ? FOOD_BY_KEY.get(i.key) : undefined;
    const base = food
      ? { source: "builtin", food_key: food.key, name: food.name, serving_label: food.serving, servings, kcal: r1(food.kcal * servings), protein_g: r1(food.protein * servings), carbs_g: r1(food.carbs * servings), fat_g: r1(food.fat * servings), fiber_g: r1(food.fiber * servings) }
      : {
          source: "ai",
          food_key: null,
          name: String(i.name ?? "Food").trim().slice(0, 80) || "Food",
          serving_label: String(i.serving_label ?? "serving").trim().slice(0, 40) || "serving",
          servings,
          kcal: r1(clamp(i.kcal, 5000)),
          protein_g: r1(clamp(i.protein, 300)),
          carbs_g: r1(clamp(i.carbs, 600)),
          fat_g: r1(clamp(i.fat, 300)),
          fiber_g: r1(clamp(i.fiber, 200)),
        };
    return { ...base, user_id: userId, day, meal };
  });
  if (!rows.length) return { ok: false, error: "Nothing to add." };
  const { error } = await db().from("food_logs").insert(rows);
  return error ? { ok: false, error: "Couldn't add that. Try again in a moment." } : { ok: true };
}

/** Counts one AI food read against today's cap. */
export async function takeMealAI(userId: string, day: string) {
  const { data, error } = await db().rpc("fit_ai_take_for", { p_user: userId, p_kind: "meal", p_day: day, p_cap: MEAL_AI_CAP });
  return !error && data === true;
}

// ---- Today summary.
export type Summary = {
  today: string;
  kg: number | null;
  kgDay: string | null;
  prevKg: number | null;
  eaten: { kcal: number; protein: number; carbs: number; fiber: number };
  target: { kcal: number; protein: number; carbs: number; fiber: number } | null;
  gymWeek: number;
  gymTarget: number | null;
  trainedToday: { gym: boolean; muscles: Muscle[] } | null;
};

export async function loadSummary(link: FitLink): Promise<Summary> {
  const client = db();
  const today = todayIn(link.tz);
  // Week starts Monday, like the website.
  const dow = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;
  const monday = addDays(today, -dow);
  const [{ data: weights }, { data: food }, { data: p }] = await Promise.all([
    client.from("weight_logs").select("day, kg, gym, muscles").eq("user_id", link.user_id).lte("day", today).order("day", { ascending: false }).limit(14),
    client.from("food_logs").select("kcal, protein_g, carbs_g, fiber_g").eq("user_id", link.user_id).eq("day", today),
    client.from("fit_profiles").select("*").eq("user_id", link.user_id).maybeSingle(),
  ]);
  const w = weights ?? [];
  const latest = w[0];
  const sum = (k: string) => Math.round((food ?? []).reduce((s, r) => s + Number((r as Record<string, unknown>)[k] ?? 0), 0));
  const profile: FitProfile | null = p
    ? {
        sex: p.sex,
        birth_year: p.birth_year,
        height_cm: Number(p.height_cm),
        activity: p.activity,
        goal: p.goal,
        target_kg: p.target_kg === null ? null : Number(p.target_kg),
        weekly_rate_kg: Number(p.weekly_rate_kg),
        diet: p.diet,
        gym_days_target: p.gym_days_target,
        water_target_ml: p.water_target_ml,
      }
    : null;
  const t = profile && latest ? targets(profile, Number(latest.kg), today) : null;
  const todayRow = w.find((r) => r.day === today);
  return {
    today,
    kg: latest ? Number(latest.kg) : null,
    kgDay: latest ? (latest.day as string) : null,
    prevKg: w[1] ? Number(w[1].kg) : null,
    eaten: { kcal: sum("kcal"), protein: sum("protein_g"), carbs: sum("carbs_g"), fiber: sum("fiber_g") },
    target: t ? { kcal: t.kcal, protein: t.protein, carbs: t.carbs, fiber: t.fiber } : null,
    gymWeek: w.filter((r) => r.day >= monday && r.gym).length,
    gymTarget: profile?.gym_days_target ?? null,
    trainedToday: todayRow ? { gym: Boolean(todayRow.gym), muscles: ((todayRow.muscles as string[]) ?? []).filter(isMuscle) } : null,
  };
}
