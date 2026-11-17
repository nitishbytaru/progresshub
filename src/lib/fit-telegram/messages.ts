import { muscleLabel, type Muscle } from "../fit-units";
import type { ParsedFood } from "../fit-ai";
import type { CoreMeal } from "../fit-foods";
import type { Summary } from "./data";

/** Fixed reply texts for the fit bot (HTML parse mode). The model never writes any of these. */

export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const n = (v: number) => Math.round(v).toLocaleString("en-US");
const kg1 = (v: number) => v.toFixed(1);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function dayLabel(day: string, today: string) {
  if (day === today) return "today";
  const t = Date.parse(`${today}T00:00:00Z`);
  const d = Date.parse(`${day}T00:00:00Z`);
  if (t - d === 86_400_000) return "yesterday";
  return `${MONTHS[new Date(d).getUTCMonth()]} ${new Date(d).getUTCDate()}`;
}

export const MEAL_LABEL: Record<CoreMeal, string> = { breakfast: "Breakfast", lunch: "Lunch", snack: "Snack", dinner: "Dinner" };

export const MENU_PROMPT = "🏋️ What are we logging?";

export const LINKED = "✅ <b>Linked to progresshub fit.</b>\n\nJust type, like:\n• <code>72.4</code> or <code>w 72.4 yesterday</code>: weigh-in\n• <code>gym chest triceps</code> or <code>rest day</code>\n• <code>lunch 2 roti dal curd</code>: food\n• <code>today</code>: your day so far";

export const HELP = "I log your fit days. Try:\n• <code>72.4</code>: weigh-in (add <code>lb</code> or <code>yesterday</code>)\n• <code>gym chest triceps</code>, <code>gym don't remember</code>, <code>rest day</code>\n• <code>ate 2 roti, dal and curd</code> (or start with breakfast / lunch / snack / dinner)\n• <code>today</code>: calories, protein, weight, gym week";

export const OFF_TOPIC = "I only log fit stuff: weigh-ins, gym days and food. Type <code>help</code> to see examples.";

export const WEIGHT_PROMPT = "⚖️ Send your weight, like <b>72.4</b> (or <b>160 lb</b>). Add <b>yesterday</b> for an older day.";
export const FOOD_PROMPT = "🍛 What did you eat? Like <b>lunch 2 roti, dal and curd</b>.";

export const NO_WEIGHT = (day: string, today: string) =>
  `⚖️ Gym days are saved with that day's weigh-in. Send the weight first, like <b>w 72.4${day === today ? "" : " " + dayLabel(day, today)}</b>, then the gym day.`;

export const weightConfirm = (kg: number, day: string, today: string) => `⚖️ <b>${kg1(kg)} kg</b> for ${dayLabel(day, today)}?`;
export const weightSaved = (kg: number, day: string, today: string) => `⚖️ Saved <b>${kg1(kg)} kg</b> for ${dayLabel(day, today)}.\n\nDid you train?`;

export const gymPickPrompt = (day: string, today: string, muscles: Muscle[], forgot: boolean) =>
  `🏋️ Gym day, ${dayLabel(day, today)}. What did you hit?\n${forgot ? "<i>Don't remember: saved without muscles.</i>" : muscles.length ? `<b>${muscles.map(muscleLabel).join(", ")}</b>` : "<i>Tap the muscles, then Save.</i>"}`;
export const gymSaved = (day: string, today: string, gym: boolean, muscles: Muscle[]) =>
  gym
    ? `🏋️ Gym day saved for ${dayLabel(day, today)}${muscles.length ? `: <b>${muscles.map(muscleLabel).join(", ")}</b>` : " (no muscles)"}.`
    : `😴 Rest day saved for ${dayLabel(day, today)}.`;

export function foodConfirm(items: ParsedFood[], meal: CoreMeal, day: string, today: string) {
  const lines = items.map((i) => `• ${esc(i.name)}${i.servings !== 1 ? ` × ${+i.servings.toFixed(2)}` : ""}: ${n(i.kcal)} kcal · ${n(i.protein)} g protein`);
  const kcal = items.reduce((s, i) => s + i.kcal, 0);
  const protein = items.reduce((s, i) => s + i.protein, 0);
  return `🍛 <b>${MEAL_LABEL[meal]}</b>, ${dayLabel(day, today)}\n${lines.join("\n")}\n\n<b>${n(kcal)} kcal · ${n(protein)} g protein</b>\n<i>AI estimate: check it, then add.</i>`;
}
export const foodSaved = (count: number, meal: CoreMeal, kcal: number) => `🍛 Added ${count} item${count === 1 ? "" : "s"} to <b>${MEAL_LABEL[meal]}</b> (${n(kcal)} kcal).`;

/** A 10-cell text bar for a share of a target. */
const bar = (v: number, of: number) => {
  const f = of > 0 ? Math.max(0, Math.min(10, Math.round((v / of) * 10))) : 0;
  return "▰".repeat(f) + "▱".repeat(10 - f);
};

export function summaryText(s: Summary) {
  const out: string[] = [`📊 <b>Today</b>, ${dayLabel(s.today, s.today)}`];
  if (s.kg !== null) {
    const delta = s.prevKg !== null ? s.kg - s.prevKg : null;
    const when = s.kgDay && s.kgDay !== s.today ? ` (${dayLabel(s.kgDay, s.today)})` : "";
    out.push(`⚖️ <b>${kg1(s.kg)} kg</b>${when}${delta ? `  ${delta > 0 ? "▲" : "▼"}${kg1(Math.abs(delta))}` : ""}`);
  } else out.push("⚖️ No weigh-in yet");
  const t = s.target;
  const row = (icon: string, label: string, v: number, of: number | undefined, unit: string) =>
    of ? `${icon} ${label} <b>${n(v)}</b> / ${n(of)} ${unit}\n<code>${bar(v, of)}</code>  ${n(Math.max(0, of - v))} left` : `${icon} ${label} <b>${n(v)}</b> ${unit}`;
  out.push("");
  out.push(row("🔥", "Calories", s.eaten.kcal, t?.kcal, "kcal"));
  out.push(row("🥩", "Protein", s.eaten.protein, t?.protein, "g"));
  out.push(row("🌾", "Carbs", s.eaten.carbs, t?.carbs, "g"));
  out.push(row("🥦", "Fiber", s.eaten.fiber, t?.fiber, "g"));
  out.push("");
  const today = s.trainedToday ? (s.trainedToday.gym ? `today: ${s.trainedToday.muscles.length ? s.trainedToday.muscles.map(muscleLabel).join(", ") : "gym"}` : "today: rest") : "today: not logged";
  out.push(`🏋️ Gym week <b>${s.gymWeek}${s.gymTarget ? `/${s.gymTarget}` : ""}</b> · ${today}`);
  if (!t) out.push("\n<i>Set up your fit profile to see targets.</i>");
  return out.join("\n");
}
