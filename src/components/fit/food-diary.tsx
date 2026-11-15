"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { copyMeal, deleteFood } from "@/app/(fit)/fit/food/actions";
import type { CustomFood, FoodEntry } from "@/lib/fit";
import {
  MEALS,
  mealLabel,
  type Diet,
  type Food,
  type Meal,
  formatQty,
} from "@/lib/fit-foods";
import type { Targets } from "@/lib/fit-nutrition";
import { AddFoodDialog } from "./add-food-dialog";
import { EditFoodDialog } from "./edit-food-dialog";
import { fitBusy, fitError, fitToast, type FitToast } from "./fit-toast";
import { KcalRing } from "./kcal-ring";
import { MacroBars } from "./macro-bars";

const utc = (d: string) => new Date(`${d}T00:00:00Z`);
const longDay = new Intl.DateTimeFormat("en", {
  weekday: "long",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const addDays = (d: string, n: number) =>
  new Date(utc(d).getTime() + n * 86_400_000).toISOString().slice(0, 10);

/** The day's food: totals ring + macros on one side, the four meals on the other. */
export function FoodDiary({
  day,
  today,
  entries,
  custom,
  targets,
  recent,
  diet,
  yesterdayMeals,
}: {
  day: string;
  today: string;
  entries: FoodEntry[];
  custom: CustomFood[];
  targets: Targets | null;
  recent: Food[];
  diet: Diet | null;
  yesterdayMeals: Meal[];
}) {
  const [adding, setAdding] = useState<Meal | null>(null);
  const [editing, setEditing] = useState<FoodEntry | null>(null);
  // Accordion: the latest meal with food starts open; switching day resets it.
  const latestMeal = () =>
    [...MEALS].reverse().find((m) => entries.some((e) => e.meal === m));
  const [open, setOpen] = useState<Set<Meal>>(
    () => new Set(latestMeal() ? [latestMeal()!] : []),
  );
  const [openDay, setOpenDay] = useState(day);
  if (openDay !== day) {
    setOpenDay(day);
    setOpen(new Set(latestMeal() ? [latestMeal()!] : []));
  }
  const toggle = (m: Meal, force?: boolean) =>
    setOpen((cur) => {
      const next = new Set(cur);
      if (force ?? !next.has(m)) next.add(m);
      else next.delete(m);
      return next;
    });
  const [lastMeal, setLastMeal] = useState<Meal>("breakfast");
  const [pending, start] = useTransition();

  const totals = entries.reduce(
    (t, e) => ({
      kcal: t.kcal + e.kcal,
      protein: t.protein + e.protein,
      carbs: t.carbs + e.carbs,
      fat: t.fat + e.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
  const run = (fn: () => Promise<{ error?: string }>, ok?: FitToast) =>
    start(async () => {
      fitBusy(ok?.mood === "sad" ? "Removing…" : "Saving…");
      const r = await fn();
      if (r.error) fitError(r.error);
      else if (ok) fitToast(ok);
    });

  const dayLabel =
    day === today
      ? "Today"
      : day === addDays(today, -1)
        ? "Yesterday"
        : longDay.format(utc(day));

  return (
    <div className="grid gap-5 md:grid-cols-12 md:items-start md:gap-6 lg:gap-10">
      {/* Day + totals */}
      <section
        aria-label="Day totals"
        className="card-in flex flex-col gap-5 rounded-2xl border border-outline-variant bg-surface p-4 sm:p-6 md:sticky md:top-6 md:col-span-5"
      >
        <div className="flex items-center justify-between gap-2">
          <Link
            href={`/food?day=${addDays(day, -1)}`}
            aria-label="Previous day"
            className="grid size-11 place-items-center rounded-full border border-outline text-ink-variant hover:bg-hover hover:text-ink"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </Link>
          <div className="text-center">
            <p className="font-display text-2xl font-bold uppercase">
              {dayLabel}
            </p>
            {day !== today && (
              <Link
                href="/food"
                className="text-xs font-semibold text-ink-subtle underline-offset-4 hover:text-ink hover:underline"
              >
                Back to today
              </Link>
            )}
          </div>
          {day < today ? (
            <Link
              href={`/food?day=${addDays(day, 1)}`}
              aria-label="Next day"
              className="grid size-11 place-items-center rounded-full border border-outline text-ink-variant hover:bg-hover hover:text-ink"
            >
              <ChevronRight className="size-5" aria-hidden />
            </Link>
          ) : (
            <span className="size-11" aria-hidden />
          )}
        </div>
        <div className="flex flex-col items-center gap-5 sm:flex-row md:flex-col lg:flex-row">
          <KcalRing eaten={totals.kcal} target={targets?.kcal ?? null} />
          <MacroBars totals={totals} targets={targets} />
        </div>
        {!targets && (
          <p className="rounded-xl border border-dashed border-outline p-3 text-sm text-ink-variant">
            <Link
              href="/me"
              className="font-semibold text-ink underline underline-offset-4"
            >
              Set up your profile
            </Link>{" "}
            to see calorie and protein targets.
          </p>
        )}
      </section>

      {/* Meals */}
      <div className="flex flex-col gap-4 md:col-span-7">
        {MEALS.map((meal, mi) => {
          const items = entries.filter((e) => e.meal === meal);
          const kcal = items.reduce((s, e) => s + e.kcal, 0);
          const isOpen = open.has(meal);
          return (
            <section
              key={meal}
              aria-label={mealLabel(meal)}
              className="card-in rounded-2xl border border-outline-variant bg-surface"
              style={{ ["--card-i" as string]: mi + 1 }}
            >
              <div className="flex items-center gap-2 py-2 pr-4 pl-2 sm:pr-5">
                <h2 className="flex min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => toggle(meal)}
                    aria-expanded={isOpen}
                    aria-controls={`meal-${meal}`}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-hover"
                  >
                    <ChevronDown
                      className={`size-5 shrink-0 text-ink-subtle transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                      aria-hidden
                    />
                    <span className="flex min-w-0 flex-col">
                      <span className="flex items-baseline gap-2">
                        <span className="font-display text-2xl font-bold uppercase">
                          {mealLabel(meal)}
                        </span>
                        <span className="text-xs font-semibold text-ink-subtle">
                          {items.length
                            ? `${items.length} item${items.length === 1 ? "" : "s"}`
                            : "Empty"}
                        </span>
                      </span>
                      {!isOpen && items.length > 0 && (
                        <span className="truncate text-xs text-ink-subtle">
                          {items.map((e) => e.name).join(", ")}
                        </span>
                      )}
                    </span>
                    {items.length > 0 && (
                      <span className="ml-auto shrink-0 font-display text-xl font-bold text-ink-variant tabular-nums">
                        {Math.round(kcal)}
                        <span className="ml-0.5 text-xs text-ink-subtle">
                          kcal
                        </span>
                      </span>
                    )}
                  </button>
                </h2>
                {!items.length && yesterdayMeals.includes(meal) && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      run(() => copyMeal(addDays(day, -1), day, meal), {
                        title: `Copied yesterday's ${mealLabel(meal).toLowerCase()}`,
                        detail: "Edit anything that changed",
                        mood: "happy",
                      })
                    }
                    className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-outline px-3 text-xs font-bold text-ink-variant hover:bg-hover hover:text-ink"
                  >
                    <Copy className="size-3.5" aria-hidden /> Same as yesterday
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setLastMeal(meal);
                    setAdding(meal);
                    toggle(meal, true);
                  }}
                  aria-label={`Add food to ${mealLabel(meal)}`}
                  className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary-hover"
                >
                  <Plus className="size-5" aria-hidden />
                </button>
              </div>
              {/* Collapsible body: rows animate between 0fr and 1fr; inert while closed. */}
              <div
                id={`meal-${meal}`}
                inert={!isOpen}
                className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
              >
                <div className="overflow-hidden">
                  {items.length > 0 ? (
                    <ul className="divide-y divide-outline-variant border-t border-outline-variant">
                      {items.map((e) => (
                        <li
                          key={e.id}
                          className="flex items-center gap-3 px-4 py-3 sm:px-5"
                        >
                          <button
                            type="button"
                            onClick={() => setEditing(e)}
                            className="-my-1 min-w-0 flex-1 rounded-lg py-1 text-left hover:bg-hover"
                          >
                            <p className="truncate font-semibold">{e.name}</p>
                            <p className="text-xs text-ink-subtle">
                              {formatQty(e.servings, e.serving_label)} ·{" "}
                              {Math.round(e.protein)} g protein
                              {e.source === "ai" ? " · estimate" : ""}
                            </p>
                          </button>
                          <span className="w-14 text-right font-display text-xl font-bold">
                            {Math.round(e.kcal)}
                          </span>
                          <button
                            type="button"
                            aria-label={`Edit ${e.name}`}
                            onClick={() => setEditing(e)}
                            className="grid size-9 place-items-center rounded-full text-ink-subtle hover:bg-hover hover:text-ink"
                          >
                            <Pencil className="size-4" aria-hidden />
                          </button>
                          <button
                            type="button"
                            aria-label={`Remove ${e.name}`}
                            disabled={pending}
                            onClick={() =>
                              run(() => deleteFood(e.id), {
                                title: `Removed ${e.name}`,
                                detail: `${mealLabel(meal)} · ${Math.round(e.kcal)} kcal`,
                                mood: "sad",
                              })
                            }
                            className="grid size-9 place-items-center rounded-full text-ink-subtle hover:bg-hover hover:text-ink"
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="border-t border-outline-variant px-4 py-4 text-sm text-ink-subtle sm:px-5">
                      Nothing logged for {mealLabel(meal).toLowerCase()} yet.
                      Tap + to add food.
                    </p>
                  )}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <EditFoodDialog entry={editing} onClose={() => setEditing(null)} />
      <AddFoodDialog
        open={adding !== null}
        onOpenChange={(o) => !o && setAdding(null)}
        day={day}
        meal={adding ?? lastMeal}
        diet={diet}
        custom={custom}
        recent={recent}
      />
    </div>
  );
}
