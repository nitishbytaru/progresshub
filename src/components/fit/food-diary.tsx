"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import { ChevronDown, Copy, Cookie, Moon, Pencil, Plus, Sun, Sunrise, Trash2, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { copyMeal, deleteFood } from "@/app/(fit)/fit/food/actions";
import type { CustomFood, FoodEntry } from "@/lib/fit";
import { ALL_MEALS, MEALS, formatQty, mealLabel, type Diet, type Food, type Meal } from "@/lib/fit-foods";
import type { Targets } from "@/lib/fit-nutrition";
import { AddFoodDialog } from "./add-food-dialog";
import { EditFoodDialog } from "./edit-food-dialog";
import { FoodIcon, foodFor } from "./food-icon";
import { FuelPlate } from "./fuel-plate";
import { fitBusy, fitError, fitToast, type FitToast } from "./fit-toast";

const MEAL_ICON: Record<Meal, LucideIcon> = { breakfast: Sunrise, lunch: Sun, snack: Cookie, dinner: Moon, custom: UtensilsCrossed };
const addDays = (d: string, n: number) => new Date(new Date(`${d}T00:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);
const ease = [0.2, 0.9, 0.25, 1] as const;

/**
 * The day's food: the fuel plate (calories + macros) on one side, the meals as a timeline on the other.
 * Meals open like an accordion; each food shows its icon; new foods drop onto their meal, removed ones
 * fold away, and on phones a row swipes left to reveal Delete.
 */
export function FoodDiary({
  day,
  entries,
  custom,
  targets,
  recent,
  diet,
  yesterdayMeals,
}: {
  day: string;
  entries: FoodEntry[];
  custom: CustomFood[];
  targets: Targets | null;
  recent: Food[];
  diet: Diet | null;
  yesterdayMeals: Meal[];
}) {
  const [adding, setAdding] = useState<Meal | null>(null);
  const [editing, setEditing] = useState<FoodEntry | null>(null);
  const [lastMeal, setLastMeal] = useState<Meal>("breakfast");
  const [swiped, setSwiped] = useState<string | null>(null);
  // The optional fifth meal: shown once asked for, or whenever it already has food.
  const [customOn, setCustomOn] = useState(false);
  const hasCustom = entries.some((e) => e.meal === "custom");
  const meals: Meal[] = customOn || hasCustom ? ALL_MEALS : MEALS;
  const [pending, start] = useTransition();
  // Accordion: the latest meal with food starts open.
  const [open, setOpen] = useState<Set<Meal>>(() => {
    const latest = [...ALL_MEALS].reverse().find((m) => entries.some((e) => e.meal === m));
    return new Set(latest ? [latest] : []);
  });
  const toggle = (m: Meal, force?: boolean) =>
    setOpen((cur) => {
      const next = new Set(cur);
      if (force ?? !next.has(m)) next.add(m);
      else next.delete(m);
      return next;
    });
  // Entries present on first paint don't animate in; anything added later drops onto its meal.
  const [firstPaint] = useState(() => new Set(entries.map((e) => e.id)));
  const fresh = entries.filter((e) => !firstPaint.has(e.id)).map((e) => e.id);

  const totals = entries.reduce(
    (t, e) => ({ kcal: t.kcal + e.kcal, protein: t.protein + e.protein, carbs: t.carbs + e.carbs, fiber: t.fiber + e.fiber }),
    { kcal: 0, protein: 0, carbs: 0, fiber: 0 },
  );
  const run = (fn: () => Promise<{ error?: string }>, ok?: FitToast) =>
    start(async () => {
      fitBusy(ok?.mood === "sad" ? "Removing…" : "Saving…");
      const r = await fn();
      if (r.error) fitError(r.error);
      else if (ok) fitToast(ok);
    });
  const remove = (e: FoodEntry) => {
    setSwiped(null);
    run(() => deleteFood(e.id), { title: `Removed ${e.name}`, detail: `${mealLabel(e.meal)} · ${Math.round(e.kcal)} kcal`, mood: "sad" });
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-12 md:items-start md:gap-6 lg:gap-10">
        {/* Fuel plate */}
        <section
          aria-label="Day totals"
          className="card-in flex min-w-0 flex-col gap-5 rounded-2xl border border-outline-variant bg-surface p-4 sm:p-6 md:sticky md:top-6 md:col-span-5"
        >
          <FuelPlate totals={totals} targets={targets} />
          {!targets && (
            <p className="rounded-xl border border-dashed border-outline p-3 text-sm text-ink-variant">
              <Link href="/me" className="font-semibold text-ink underline underline-offset-4">
                Set up your profile
              </Link>{" "}
              to see calorie and protein targets.
            </p>
          )}
        </section>

        {/* Meal timeline */}
        <ol className="relative flex min-w-0 flex-col gap-3 md:col-span-7" aria-label="Meals">
          {/* The sleeve the meals hang on. */}
          <span className="absolute top-6 bottom-6 left-[1.1875rem] w-[3px] rounded-full bg-steel/40" aria-hidden />
          {meals.map((meal, mi) => {
            const items = entries.filter((e) => e.meal === meal);
            const kcal = items.reduce((s, e) => s + e.kcal, 0);
            const isOpen = open.has(meal);
            const Icon = MEAL_ICON[meal];
            return (
              <li key={meal} className="card-in relative flex gap-3" style={{ ["--card-i" as string]: mi + 1 }}>
                {/* Node: filled once the meal has food; pulses when its total changes. */}
                <motion.span
                  key={`${meal}-${items.length}`}
                  className={`relative z-10 mt-3 grid size-10 shrink-0 place-items-center rounded-full border-2 ${items.length ? "border-ink bg-primary text-primary-foreground" : "border-steel/60 bg-background text-ink-subtle"}`}
                  initial={{ scale: items.length ? 0.7 : 1 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 14 }}
                  aria-hidden
                >
                  <Icon className="size-[18px]" />
                </motion.span>

                <section aria-label={mealLabel(meal)} className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-outline-variant bg-surface">
                  <div className="flex items-center gap-2 py-2 pr-3 pl-1 sm:pr-4">
                    <h2 className="flex min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => toggle(meal)}
                        aria-expanded={isOpen}
                        aria-controls={`meal-${meal}`}
                        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-hover"
                      >
                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                          <span className="flex items-baseline gap-2">
                            <span className="font-display text-2xl leading-none font-bold uppercase">{mealLabel(meal)}</span>
                            <span className={`text-xs font-semibold whitespace-nowrap text-ink-subtle ${items.length ? "hidden sm:inline" : ""}`}>
                              {items.length ? `${items.length} item${items.length === 1 ? "" : "s"}` : "Empty"}
                            </span>
                          </span>
                          {items.length > 0 && (
                            <span className="flex items-center gap-2.5">
                              {/* Collapsed: the meal's foods as a stack of icon discs. */}
                              <AnimatePresence initial={false}>
                                {!isOpen && (
                                  <motion.span
                                    className="flex shrink-0 items-center"
                                    initial={{ opacity: 0, width: 0 }}
                                    animate={{ opacity: 1, width: "auto" }}
                                    exit={{ opacity: 0, width: 0 }}
                                    transition={{ duration: 0.25 }}
                                    aria-hidden
                                  >
                                    {items.slice(0, 4).map((e, i) => (
                                      <FoodIcon key={e.id} food={foodFor(e)} size={24} className={`ring-2 ring-surface ${i ? "-ml-2" : ""}`} />
                                    ))}
                                    {items.length > 4 && (
                                      <span className="-ml-2 grid size-6 place-items-center rounded-full bg-track text-[0.625rem] font-bold ring-2 ring-surface">+{items.length - 4}</span>
                                    )}
                                  </motion.span>
                                )}
                              </AnimatePresence>
                            </span>
                          )}
                        </span>
                        {items.length > 0 && (
                          <span className="shrink-0 font-display text-xl font-bold text-ink-variant tabular-nums">
                            {Math.round(kcal)}
                            <span className="ml-0.5 text-xs text-ink-subtle">kcal</span>
                          </span>
                        )}
                        <ChevronDown className={`size-4 shrink-0 text-ink-subtle transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} aria-hidden />
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
                        className="hidden h-9 shrink-0 items-center gap-1.5 rounded-full border border-outline px-3 text-xs font-bold text-ink-variant hover:bg-hover hover:text-ink sm:inline-flex"
                      >
                        <Copy className="size-3.5" aria-hidden /> Same as yesterday
                      </button>
                    )}
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.9, rotate: 90 }}
                      onClick={() => {
                        setLastMeal(meal);
                        setAdding(meal);
                        toggle(meal, true);
                      }}
                      aria-label={`Add food to ${mealLabel(meal)}`}
                      className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary-hover"
                    >
                      <Plus className="size-5" aria-hidden />
                    </motion.button>
                  </div>

                  {/* Body: rows animate open; inert while closed. */}
                  <div
                    id={`meal-${meal}`}
                    inert={!isOpen}
                    className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                  >
                    <div className="overflow-hidden">
                      {items.length > 0 ? (
                        <ul className="border-t border-outline-variant">
                          <AnimatePresence initial={false}>
                            {items.map((e, i) => (
                              <EntryRow
                                key={e.id}
                                e={e}
                                index={i}
                                open={isOpen}
                                fresh={fresh.includes(e.id)}
                                swiped={swiped === e.id}
                                onSwipe={(on) => setSwiped(on ? e.id : null)}
                                onEdit={() => setEditing(e)}
                                onRemove={() => remove(e)}
                                pending={pending}
                              />
                            ))}
                          </AnimatePresence>
                        </ul>
                      ) : (
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant px-4 py-4">
                          <p className="text-sm text-ink-subtle">Nothing logged for {mealLabel(meal).toLowerCase()} yet.</p>
                          {meal === "custom" && (
                            <button type="button" onClick={() => setCustomOn(false)} className="h-9 rounded-full px-3 text-xs font-bold text-ink-variant underline-offset-4 hover:text-ink hover:underline">
                              Hide
                            </button>
                          )}
                          {yesterdayMeals.includes(meal) && (
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
                              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-outline px-3 text-xs font-bold text-ink-variant hover:bg-hover hover:text-ink sm:hidden"
                            >
                              <Copy className="size-3.5" aria-hidden /> Same as yesterday
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              </li>
            );
          })}

          {/* Optional fifth meal. */}
          {!customOn && !hasCustom && (
            <motion.li className="relative flex gap-3" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <span className="relative z-10 mt-1 grid size-10 shrink-0 place-items-center rounded-full border-2 border-dashed border-steel/60 bg-background text-ink-subtle" aria-hidden>
                <Plus className="size-4" />
              </span>
              <button
                type="button"
                onClick={() => {
                  setCustomOn(true);
                  toggle("custom", true);
                }}
                className="flex h-12 flex-1 items-center gap-2 rounded-2xl border border-dashed border-outline px-4 text-sm font-bold text-ink-variant transition-colors hover:border-ink-subtle hover:bg-hover hover:text-ink"
              >
                <UtensilsCrossed className="size-4" aria-hidden /> Add custom meal
              </button>
            </motion.li>
          )}
        </ol>

        <EditFoodDialog entry={editing} onClose={() => setEditing(null)} />
        <AddFoodDialog
          open={adding !== null}
          onOpenChange={(o) => !o && setAdding(null)}
          day={day}
          meal={adding ?? lastMeal}
          diet={diet}
          custom={custom}
          recent={recent}
          targets={targets}
        />
      </div>
    </MotionConfig>
  );
}

/** One food: icon, name, amount, kcal, edit and delete. Swipe left on touch to reveal Delete. */
function EntryRow({
  e,
  index,
  open,
  fresh,
  swiped,
  onSwipe,
  onEdit,
  onRemove,
  pending,
}: {
  e: FoodEntry;
  index: number;
  open: boolean;
  fresh: boolean;
  swiped: boolean;
  onSwipe: (on: boolean) => void;
  onEdit: () => void;
  onRemove: () => void;
  pending: boolean;
}) {
  const reduce = useReducedMotion();
  const food = foodFor(e);
  return (
    <motion.li
      layout
      className="relative overflow-hidden border-b border-outline-variant last:border-b-0"
      initial={fresh ? { opacity: 0, height: 0 } : false}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease }}
    >
      {/* Revealed behind the row when swiped. */}
      <button
        type="button"
        tabIndex={swiped ? 0 : -1}
        onClick={onRemove}
        disabled={pending}
        className="absolute inset-y-0 right-0 flex w-24 items-center justify-center gap-1.5 bg-primary-soft text-sm font-bold text-ink"
        aria-label={`Delete ${e.name}`}
        aria-hidden={!swiped}
      >
        <Trash2 className="size-4" aria-hidden /> Delete
      </button>
      <motion.div
        drag={reduce ? false : "x"}
        dragDirectionLock
        dragConstraints={{ left: -96, right: 0 }}
        dragElastic={0.08}
        dragSnapToOrigin={false}
        animate={{ x: swiped ? -96 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 40 }}
        onDragEnd={(_, info) => onSwipe(info.offset.x < -48)}
        className={`relative flex touch-pan-y items-center gap-3 bg-surface px-4 py-3 ${fresh ? "food-flash" : ""}`}
      >
        <motion.span
          initial={fresh ? { y: -28, scale: 0.5, opacity: 0 } : open ? { scale: 0.6, opacity: 0 } : false}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          transition={fresh ? { type: "spring", stiffness: 520, damping: 13, delay: 0.1 } : { type: "spring", stiffness: 420, damping: 22, delay: 0.04 * index }}
        >
          <FoodIcon food={food} size={40} />
        </motion.span>
        <button type="button" onClick={onEdit} className="-my-1 min-w-0 flex-1 rounded-lg py-1 text-left hover:bg-hover">
          <p className="truncate font-semibold">{e.name}</p>
          <p className="text-xs text-ink-subtle">
            {formatQty(e.servings, e.serving_label)} · {Math.round(e.protein)} g protein
            {e.source === "ai" ? " · estimate" : ""}
          </p>
        </button>
        <span className="w-12 text-right font-display text-xl font-bold tabular-nums">{Math.round(e.kcal)}</span>
        <button
          type="button"
          aria-label={`Edit ${e.name}`}
          onClick={onEdit}
          className="grid size-9 place-items-center rounded-full text-ink-subtle hover:bg-hover hover:text-ink"
        >
          <Pencil className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          aria-label={`Remove ${e.name}`}
          disabled={pending}
          onClick={onRemove}
          className="hidden size-9 place-items-center rounded-full text-ink-subtle hover:bg-hover hover:text-ink sm:grid"
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      </motion.div>
    </motion.li>
  );
}
