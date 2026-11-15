"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Shuffle } from "lucide-react";
import { logPlannedMeal } from "@/app/(fit)/fit/coach/actions";
import { formatQty, mealLabel, type Diet } from "@/lib/fit-foods";
import { planDay } from "@/lib/fit-mealplan";
import { PlateLoader } from "./plate-loader";
import { fitBusy, fitError, fitToast } from "./fit-toast";

/**
 * Today's eating plan from the food list, sized to the calorie and protein targets for the user's
 * diet. Swap any item (only that slot changes) or log a whole meal to the diary in one tap.
 */
export function MealPlan({
  kcal,
  protein,
  diet,
  today,
}: {
  kcal: number;
  protein: number;
  diet: Diet;
  today: string;
}) {
  const [swaps, setSwaps] = useState<Record<string, number>>({});
  const [logged, setLogged] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [busyMeal, setBusyMeal] = useState<string | null>(null);
  const plan = useMemo(
    () => planDay({ kcal, protein, diet, seed: today, swaps }),
    [kcal, protein, diet, today, swaps],
  );

  return (
    <section
      aria-label="Today's meal plan"
      className="card-in flex flex-col gap-4 rounded-2xl border border-outline-variant bg-surface p-4 sm:p-6"
      style={{ ["--card-i" as string]: 2 }}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl font-bold uppercase">
            Eat today
          </h2>
          <p className="text-sm text-ink-variant">
            Built for your {kcal} kcal and {protein} g protein
          </p>
        </div>
        <p className="font-display leading-none">
          <span className="text-3xl font-bold">{plan.kcal}</span>
          <span className="ml-1 text-sm text-ink-subtle">
            kcal · {plan.protein} g P
          </span>
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {plan.meals.map((m) => (
          <div
            key={m.meal}
            className="flex flex-col gap-2 rounded-xl border border-outline-variant bg-background p-3"
          >
            <div className="flex items-baseline justify-between">
              <h3 className="text-xs font-bold tracking-[0.14em] text-ink-subtle uppercase">
                {mealLabel(m.meal)}
              </h3>
              <span className="font-display text-lg font-bold text-ink-variant">
                {m.kcal}
              </span>
            </div>
            <ul className="flex flex-col">
              {m.items.map((it) => (
                <li
                  key={it.slot + it.food.key}
                  className="group flex items-center gap-2 py-1"
                >
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="font-display text-base font-bold">
                      {it.servings}×
                    </span>{" "}
                    {it.food.name}
                    <span className="block text-xs text-ink-subtle">
                      {formatQty(it.servings, it.food.serving)} ·{" "}
                      {Math.round(it.protein)} g P
                    </span>
                  </span>
                  <button
                    type="button"
                    aria-label={`Swap ${it.food.name}`}
                    onClick={() =>
                      setSwaps({
                        ...swaps,
                        [`${m.meal}:${it.slot}`]:
                          (swaps[`${m.meal}:${it.slot}`] ?? 0) + 1,
                      })
                    }
                    className="grid size-8 shrink-0 place-items-center rounded-full text-ink-subtle hover:bg-hover hover:text-ink"
                  >
                    <Shuffle className="size-3.5" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              disabled={pending || logged[m.meal]}
              onClick={() => {
                setBusyMeal(m.meal);
                start(async () => {
                  fitBusy("Logging meal…");
                  const r = await logPlannedMeal(
                    m.meal,
                    m.items.map((i) => ({
                      key: i.food.key,
                      servings: i.servings,
                    })),
                  );
                  if (r.error) {
                    setMsg(r.error);
                    fitError(r.error);
                  } else {
                    fitToast({
                      title: `${mealLabel(m.meal)} logged`,
                      detail: "Added to today's diary",
                      mood: "happy",
                    });
                    setLogged({ ...logged, [m.meal]: true });
                    setMsg(`${mealLabel(m.meal)} logged to today's diary.`);
                  }
                });
              }}
              aria-busy={pending && busyMeal === m.meal}
              className="mt-auto inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-outline text-sm font-bold text-ink-variant transition-colors hover:bg-hover hover:text-ink disabled:opacity-60"
            >
              {logged[m.meal] ? (
                <>
                  <Check className="size-4" aria-hidden /> Logged
                </>
              ) : pending && busyMeal === m.meal ? (
                <>
                  <PlateLoader size="sm" /> Logging…
                </>
              ) : (
                "Log this meal"
              )}
            </button>
          </div>
        ))}
      </div>
      <p aria-live="polite" className="min-h-5 text-sm text-ink-variant">
        {msg}
      </p>
    </section>
  );
}
