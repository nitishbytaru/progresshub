/**
 * Talk to Coach Dumbo: chat turns and the edits he proposes. Pure (no I/O). An edit is never trusted:
 * it's cleaned against what's locked (done days, Sunday, meals already eaten) before it can be shown,
 * and again before it's applied.
 */
import { lockedDays, openDays, weekDays, type CoachDay, type MergedDay } from "./fit-coach-plan";
import { validatePrep, type Macros, type PrepMeal, type PrepWarning } from "./fit-coach-meals";
import { MEALS, type CoreMeal } from "./fit-foods";
import type { Mood } from "./fit-mascot";
import { MUSCLES, isMuscle, muscleLabel, type Muscle } from "./fit-units";

export type WeekChange = { days: CoachDay[]; changed: string[]; before: CoachDay[]; notes: string[] };
export type MealChange = { meals: PrepMeal[]; changed: CoreMeal[]; before: PrepMeal[]; warnings: PrepWarning[] };
export type Proposal = { week?: WeekChange; meals?: MealChange };
export type ProposalStatus = "pending" | "applied" | "discarded" | "undone";

export type ChatTurn =
  | { role: "user"; text: string; at: string }
  | {
      role: "dumbo";
      text: string;
      mood: Mood;
      at: string;
      proposal?: Proposal;
      status?: ProposalStatus;
      /** When the edit was applied (the hero quotes it until the plan is regenerated). */
      appliedAt?: string;
      /** What the plan was right before Apply, for Undo. */
      undo?: { week?: CoachDay[] | null; meals?: { meals: PrepMeal[]; warnings: PrepWarning[] } | null };
    };

export const MAX_TURNS = 40;
export const MOODS: Mood[] = ["idle", "curious", "thinking", "happy", "proud", "sad", "sore", "sleepy", "shocked", "flex"];
const order = (ms: Muscle[]) => MUSCLES.filter((m) => ms.includes(m));
const same = (a: CoachDay, b: CoachDay) => a.rest === b.rest && a.muscles.length === b.muscles.length && a.muscles.every((m) => b.muscles.includes(m));

/** The week as it stands (plan where there is one, else rest), seven days. */
export function currentWeek(merged: MergedDay[]): CoachDay[] {
  return merged.map((d) => d.planned ?? { day: d.day, muscles: d.muscles, rest: d.rest, note: d.note });
}

/**
 * Clean the AI's week edit. Done days and Sunday stay as they are; open days take the AI's muscles
 * (max 3, known groups) or keep the current plan when it didn't mention them. The session count is
 * not forced (you may ask for more or fewer days); back-to-back muscles are flagged in `notes`.
 * Null when nothing actually changes.
 */
export function validateWeekEdit(raw: unknown, merged: MergedDay[], today: string): WeekChange | null {
  const before = currentWeek(merged);
  const locked = new Map(lockedDays(merged).map((d) => [d.day, d]));
  const open = new Set(openDays(merged));
  const all = weekDays(today);
  const fromAI = new Map(
    (Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [])
      .filter((d) => d && typeof d.day === "string" && open.has(d.day as string))
      .map((d) => {
        const muscles = order((Array.isArray(d.muscles) ? d.muscles : []).filter(isMuscle)).slice(0, 3);
        const rest = Boolean(d.rest) || !muscles.length;
        const note = typeof d.note === "string" ? d.note.trim().slice(0, 60) : "";
        return [d.day as string, { day: d.day as string, muscles: rest ? [] : muscles, rest, note: note || (rest ? "Rest & recover" : "") }] as const;
      }),
  );
  const days: CoachDay[] = all.map((day, i) => {
    const lock = locked.get(day);
    if (lock) return lock;
    if (i === 6) return { day, muscles: [], rest: true, note: "Day off" };
    return fromAI.get(day) ?? before[i];
  });
  const changed = days.filter((d, i) => open.has(d.day) && !same(d, before[i])).map((d) => d.day);
  if (!changed.length) return null;
  const notes: string[] = [];
  for (let i = 1; i < 7; i++) {
    const both = days[i].muscles.filter((m) => days[i - 1].muscles.includes(m));
    if (both.length) notes.push(`${both.map(muscleLabel).join(" + ")} on back-to-back days`);
  }
  return { days, changed, before, notes };
}

/**
 * Clean the AI's meal edit: only meals not yet eaten can change, the rest of today's prep is kept,
 * and warnings (shortfalls, ingredients you didn't list) are worked out on the merged result.
 * Null when nothing actually changes.
 */
export function validateMealEdit(
  raw: unknown,
  rawWarnings: unknown,
  current: PrepMeal[],
  remaining: CoreMeal[],
  left: Macros,
  ingredients: string[],
): MealChange | null {
  const edited = validatePrep({ meals: Array.isArray(raw) ? raw : [], warnings: [] }, remaining, left, ingredients).meals;
  if (!edited.length) return null;
  const byMeal = new Map(current.map((m) => [m.meal, m]));
  const changed = edited.filter((m) => {
    const old = byMeal.get(m.meal);
    return !old || old.dish !== m.dish || Math.round(old.kcal) !== Math.round(m.kcal) || Math.round(old.protein) !== Math.round(m.protein);
  });
  if (!changed.length) return null;
  changed.forEach((m) => byMeal.set(m.meal, m));
  const merged = MEALS.flatMap((m) => (byMeal.has(m) && remaining.includes(m) ? [byMeal.get(m)!] : []));
  const { warnings } = validatePrep({ meals: merged, warnings: Array.isArray(rawWarnings) ? rawWarnings : [] }, remaining, left, ingredients);
  return { meals: merged, changed: changed.map((m) => m.meal), before: current, warnings };
}

/** Clamp a mood from the AI to one Dumbo knows. */
export const cleanMood = (m: unknown): Mood => (MOODS.includes(m as Mood) ? (m as Mood) : "happy");
