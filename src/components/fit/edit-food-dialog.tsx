"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteFood, updateFood } from "@/app/(fit)/fit/food/actions";
import type { FoodEntry } from "@/lib/fit";
import { MEALS, formatQty, isLiquid, mealLabel, servingStep, type Meal } from "@/lib/fit-foods";
import { Stepper } from "./add-food-dialog";
import { fitBusy, fitError, fitToast } from "./fit-toast";
import { PlateLoader } from "@/components/fit/plate-loader";

const r1 = (n: number) => Math.round(n * 10) / 10;
const MACROS = [
  { k: "kcal", label: "kcal" },
  { k: "protein", label: "Protein g" },
  { k: "carbs", label: "Carbs g" },
  { k: "fat", label: "Fat g" },
] as const;
type MacroKey = (typeof MACROS)[number]["k"];

/** Edit one logged food: name, meal, servings and nutrition per serving (totals update live). */
export function EditFoodDialog({
  entry,
  onClose,
}: {
  entry: FoodEntry | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={entry !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88dvh] gap-4 overflow-y-auto rounded-2xl border border-outline-variant bg-surface p-5 sm:max-w-lg">
        {/* Keyed so the form resets to each entry's saved values when it opens. */}
        {entry && <EditForm key={entry.id} entry={entry} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function EditForm({
  entry,
  onClose,
}: {
  entry: FoodEntry;
  onClose: () => void;
}) {
  const per = (v: number) => String(r1(v / entry.servings));
  const [name, setName] = useState(entry.name);
  const [meal, setMeal] = useState<Meal>(entry.meal);
  const [servings, setServings] = useState(entry.servings);
  const [macro, setMacro] = useState<Record<MacroKey, string>>({
    kcal: per(entry.kcal),
    protein: per(entry.protein),
    carbs: per(entry.carbs),
    fat: per(entry.fat),
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const num = (k: MacroKey) => Number(macro[k] || 0);
  const totalKcal = Math.round(num("kcal") * servings);
  const valid =
    name.trim() &&
    MACROS.every(
      ({ k }) => macro[k] !== "" && Number.isFinite(Number(macro[k])),
    );
  const numIn =
    "h-12 w-full rounded-xl border border-outline bg-background px-3 font-display text-2xl font-bold outline-none focus:border-ink";

  const save = () =>
    start(async () => {
      fitBusy("Saving changes…");
      const r = await updateFood(entry.id, {
        name,
        meal,
        servings,
        kcal: num("kcal"),
        protein: num("protein"),
        carbs: num("carbs"),
        fat: num("fat"),
      });
      if (r.error) {
        setMsg(r.error);
        fitError(r.error);
      } else {
        fitToast({
          title: `Updated ${name.trim()}`,
          detail:
            meal !== entry.meal
              ? `Moved to ${mealLabel(meal)}`
              : `${totalKcal} kcal`,
          mood: "proud",
        });
        onClose();
      }
    });
  const remove = () =>
    start(async () => {
      fitBusy("Removing…");
      const r = await deleteFood(entry.id);
      if (r.error) {
        setMsg(r.error);
        fitError(r.error, "Couldn't remove that");
      } else {
        fitToast({
          title: `Removed ${entry.name}`,
          detail: `${mealLabel(entry.meal)} · ${Math.round(entry.kcal)} kcal`,
          mood: "sad",
        });
        onClose();
      }
    });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className="flex flex-col gap-1">
        <DialogTitle className="font-display text-3xl font-bold uppercase">
          Edit food
        </DialogTitle>
        <DialogDescription className="text-sm text-ink-subtle">
          {entry.source === "ai"
            ? "This was an AI estimate. Correct anything that's off."
            : "Change the amount, move it to another meal, or fix the numbers."}
        </DialogDescription>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-bold tracking-[0.14em] text-ink-subtle uppercase">
          Name
        </span>
        <input
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
          className="h-12 rounded-xl border border-outline bg-background px-4 font-semibold outline-none focus:border-ink"
        />
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-bold tracking-[0.14em] text-ink-subtle uppercase">
          Meal
        </span>
        <div
          className="grid grid-cols-2 gap-2 sm:grid-cols-4"
          role="radiogroup"
          aria-label="Meal"
        >
          {MEALS.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={meal === m}
              onClick={() => setMeal(m)}
              className={`h-10 rounded-full border text-sm font-bold transition-colors ${meal === m ? "border-ink bg-primary text-primary-foreground" : "border-outline text-ink-variant hover:bg-hover"}`}
            >
              {mealLabel(m)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="flex flex-col">
          <span className="text-xs font-bold tracking-[0.14em] text-ink-subtle uppercase">
            Servings
          </span>
          <span className="text-sm text-ink-variant">
            {formatQty(servings, entry.serving_label)}
          </span>
        </span>
        <Stepper
          value={servings}
          onChange={(v) => setServings(r1(v))}
          step={servingStep(entry.serving_label)}
          format={isLiquid(entry.serving_label) ? (v) => formatQty(v, entry.serving_label) : undefined}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-bold tracking-[0.14em] text-ink-subtle uppercase">
          Per serving
        </span>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {MACROS.map(({ k, label }) => (
            <label key={k} className="flex flex-col gap-1">
              <span className="text-[0.6875rem] font-bold text-ink-subtle">
                {label}
              </span>
              <input
                inputMode="decimal"
                value={macro[k]}
                onChange={(e) =>
                  setMacro({
                    ...macro,
                    [k]: e.target.value.replace(/[^\d.]/g, "").slice(0, 6),
                  })
                }
                className={numIn}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1 border-t border-outline-variant pt-3">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold text-ink-variant">Total</span>
          <span className="font-display text-3xl font-bold tabular-nums">
            {totalKcal} <span className="text-base text-ink-subtle">kcal</span>
          </span>
        </div>
        <p className="text-right text-xs text-ink-subtle tabular-nums">
          {r1(num("protein") * servings)} g protein ·{" "}
          {r1(num("carbs") * servings)} g carbs · {r1(num("fat") * servings)} g
          fat
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={remove}
          aria-label={`Delete ${entry.name}`}
          className="inline-flex h-12 items-center gap-1.5 rounded-full border border-outline px-4 text-sm font-bold text-ink-variant hover:bg-hover hover:text-ink disabled:opacity-50"
        >
          <Trash2 className="size-4" aria-hidden /> Delete
        </button>
        <button
          type="submit"
          disabled={pending || !valid}
          className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-primary font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {pending ? (
            <>
              <PlateLoader size="sm" /> Saving…
            </>
          ) : (
            "Save changes"
          )}
        </button>
      </div>

      <p aria-live="polite" className="min-h-5 text-sm text-ink-variant">
        {msg}
      </p>
    </form>
  );
}
