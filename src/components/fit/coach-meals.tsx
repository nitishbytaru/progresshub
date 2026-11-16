"use client";

import { useEffect, useRef, useState, useTransition, type CSSProperties } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { Check, ChefHat, ChevronDown, Plus, Sparkles, X } from "lucide-react";
import { generateMealPrep, logPrepMeal, saveIngredients } from "@/app/(fit)/fit/coach/actions";
import type { MealPrepRow, PrepMeal } from "@/lib/fit-coach-meals";
import { MEALS, mealLabel, type CoreMeal } from "@/lib/fit-foods";
import { Dumbo } from "./dumbo";
import { fitBusy, fitError, fitToast } from "./fit-toast";
import { PlateLoader } from "./plate-loader";

type Totals = { kcal: number; protein: number; carbs: number; fiber: number };

/**
 * Today's meal prep: list what's in the kitchen, and the coach plans the meals you haven't logged
 * yet, counting what you already ate. Shortfalls (usually protein) come back as a warning to add an
 * ingredient and generate again. Each dish logs to the Food diary in one tap.
 */
export function CoachMeals({
  prep,
  targets,
  eaten,
  loggedMeals,
}: {
  prep: MealPrepRow | null;
  targets: Totals | null;
  eaten: Totals;
  /** Meals with food logged today, with their calories. */
  loggedMeals: { meal: CoreMeal; kcal: number }[];
}) {
  const [items, setItems] = useState<string[]>(prep?.ingredients ?? []);
  const [draft, setDraft] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<"gen" | CoreMeal | null>(null);
  const logged = new Set(loggedMeals.map((m) => m.meal));
  const remaining = MEALS.filter((m) => !logged.has(m));

  // Save the ingredient list as it changes (debounced), so it's there for the rest of the day.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => void saveIngredients(items), 700);
    return () => clearTimeout(t);
  }, [items]);

  const add = (raw: string) => {
    const parts = raw.split(",").map((p) => p.trim()).filter((p) => p.length >= 2);
    if (!parts.length) return;
    setItems((cur) => {
      const have = new Set(cur.map((c) => c.toLowerCase()));
      return [...cur, ...parts.filter((p) => !have.has(p.toLowerCase()))].slice(0, 30);
    });
    setDraft("");
  };

  const generate = () => {
    const list = draft.trim() ? [...items, draft.trim()] : items;
    if (draft.trim()) add(draft);
    setBusy("gen");
    start(async () => {
      fitBusy("Planning your meals…");
      const r = await generateMealPrep(list);
      setBusy(null);
      if (r.error) {
        setMsg(r.error);
        return void fitError(r.error, "No meal prep");
      }
      setMsg(null);
      fitToast({
        title: `${r.meals} meal${r.meals === 1 ? "" : "s"} planned`,
        detail: r.warnings ? "Check the coach's note about missing ingredients" : "Built from what you have",
        mood: r.warnings ? "sore" : "proud",
      });
    });
  };

  const log = (m: PrepMeal) => {
    setBusy(m.meal);
    start(async () => {
      fitBusy(`Logging ${mealLabel(m.meal).toLowerCase()}…`);
      const r = await logPrepMeal(m.meal);
      setBusy(null);
      if (r.error) return void fitError(r.error, "Meal not logged");
      fitToast({ title: `Logged ${r.dish}`, detail: `${mealLabel(m.meal)} · ${Math.round(m.kcal)} kcal`, mood: "happy" });
    });
  };

  const bar = (label: string, color: string, v: number, t: number | undefined, unit: string) => (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[0.6875rem] font-bold tracking-[0.1em] text-ink-subtle uppercase">
          <span className="size-2 rounded-full" style={{ background: color }} aria-hidden />
          {label}
        </span>
        <span className="font-display text-xl leading-none font-bold tabular-nums">
          {Math.round(v)}
          <span className="text-xs text-ink-subtle">{t ? `/${t}` : ""}{unit}</span>
        </span>
      </div>
      <span className="h-1.5 overflow-hidden rounded-full bg-track" aria-hidden>
        <motion.span
          className="block h-full origin-left rounded-full"
          style={{ background: color }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: t ? Math.min(1, v / t) : 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </span>
    </div>
  );

  return (
    <MotionConfig reducedMotion="user">
      <section aria-label="Meal prep" className="card-in flex flex-col gap-5 rounded-3xl border border-outline-variant bg-surface p-4 sm:p-6" style={{ "--card-i": 2 } as CSSProperties}>
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-3xl leading-none font-bold uppercase">Meal prep</h2>
          <p className="text-sm text-ink-subtle">Tell me what&apos;s in your kitchen. I&apos;ll plan the meals you haven&apos;t eaten yet.</p>
        </div>

        {/* Today so far */}
        <div className="flex flex-col gap-3 rounded-2xl border border-outline-variant bg-background p-3 sm:p-4">
          <div className="grid grid-cols-2 gap-4">
            {bar("Calories", "var(--macro-kcal)", eaten.kcal, targets?.kcal, "")}
            {bar("Protein", "var(--macro-protein)", eaten.protein, targets?.protein, "g")}
          </div>
          <ul className="flex flex-wrap gap-1.5">
            {MEALS.map((m) => {
              const l = loggedMeals.find((x) => x.meal === m);
              return (
                <li
                  key={m}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-bold ${l ? "border-ink bg-primary text-primary-foreground" : "border-outline text-ink-variant"}`}
                >
                  {l ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : null}
                  {mealLabel(m)}
                  <span className={l ? "opacity-70" : "text-ink-subtle"}>{l ? `${Math.round(l.kcal)} kcal` : "to plan"}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Ingredients */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold tracking-[0.14em] text-ink-subtle uppercase">What you have</span>
          <div className="flex min-h-14 flex-wrap items-center gap-1.5 rounded-2xl border border-outline bg-background p-2 focus-within:border-ink">
            <AnimatePresence initial={false}>
              {items.map((it) => (
                <motion.span
                  key={it}
                  layout
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="inline-flex h-9 items-center gap-1 rounded-full bg-hover pr-1 pl-3 text-sm font-semibold"
                >
                  {it}
                  <button type="button" aria-label={`Remove ${it}`} onClick={() => setItems((cur) => cur.filter((c) => c !== it))} className="grid size-7 place-items-center rounded-full text-ink-subtle hover:bg-hover hover:text-ink">
                    <X className="size-3.5" aria-hidden />
                  </button>
                </motion.span>
              ))}
            </AnimatePresence>
            <input
              value={draft}
              onChange={(e) => {
                const v = e.target.value;
                if (v.endsWith(",")) add(v);
                else setDraft(v.slice(0, 40));
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add(draft);
                } else if (e.key === "Backspace" && !draft && items.length) setItems((cur) => cur.slice(0, -1));
              }}
              onBlur={() => draft.trim() && add(draft)}
              placeholder={items.length ? "Add more…" : "e.g. eggs, paneer 200 g, rice, spinach"}
              aria-label="Add an ingredient"
              className="h-9 min-w-40 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-ink-subtle"
            />
          </div>
          <p className="text-xs text-ink-subtle">Press Enter or a comma after each one. Amounts help but aren&apos;t needed.</p>
        </div>

        <motion.button
          type="button"
          onClick={generate}
          disabled={pending || (!items.length && !draft.trim()) || !remaining.length}
          whileTap={{ scale: 0.97 }}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary font-bold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {busy === "gen" ? <PlateLoader size="sm" /> : <Sparkles className="size-4" aria-hidden />}
          {busy === "gen" ? "Planning…" : !remaining.length ? "Every meal is logged today" : prep?.meals.length ? "Generate again" : "Generate meal prep"}
        </motion.button>
        {msg && (
          <p role="status" className="-mt-2 text-sm text-ink-variant">
            {msg}
          </p>
        )}

        {/* Coach's notes: what's missing */}
        <AnimatePresence>
          {prep && prep.warnings.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-3 rounded-2xl border border-ink bg-hover p-3"
              role="note"
            >
              <span className="grid h-14 w-16 shrink-0 place-items-center rounded-xl bg-background pt-1">
                <Dumbo mood="sore" size={60} outfit="coach" />
              </span>
              <ul className="flex flex-col gap-1.5 text-sm">
                {prep.warnings.map((w, i) => (
                  <li key={i}>{w.text}</li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        {/* The plan */}
        {prep && prep.meals.length > 0 && (
          <ol className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {prep.meals.map((m, i) => {
              const isLogged = logged.has(m.meal);
              return (
                <motion.li
                  key={`${prep.generated_at}-${m.meal}`}
                  initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.35, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  className={`flex flex-col gap-3 rounded-2xl border p-4 ${isLogged ? "border-outline-variant bg-background opacity-70" : "border-outline bg-background"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-[0.6875rem] font-bold tracking-[0.12em] text-ink-subtle uppercase">{mealLabel(m.meal)}</span>
                      <span className="font-display text-2xl leading-tight font-bold">{m.dish}</span>
                    </div>
                    <ChefHat className="size-5 shrink-0 text-ink-subtle" aria-hidden />
                  </div>
                  <ul className="flex flex-wrap gap-1.5">
                    {m.items.map((it, k) => (
                      <li key={k} className="rounded-full border border-outline-variant px-2.5 py-1 text-xs">
                        <span className="font-bold">{it.qty}</span> {it.name}
                      </li>
                    ))}
                  </ul>
                  <dl className="grid grid-cols-4 divide-x divide-outline-variant rounded-xl border border-outline-variant text-center">
                    {[
                      { l: "kcal", v: m.kcal, c: "var(--macro-kcal)" },
                      { l: "Protein", v: m.protein, c: "var(--macro-protein)" },
                      { l: "Carbs", v: m.carbs, c: "var(--macro-carbs)" },
                      { l: "Fiber", v: m.fiber, c: "var(--macro-fiber)" },
                    ].map((x) => (
                      <div key={x.l} className="flex flex-col items-center gap-0.5 py-2">
                        <dt className="flex items-center gap-1 text-[0.625rem] font-bold tracking-wide text-ink-subtle uppercase">
                          <span className="size-1.5 rounded-full" style={{ background: x.c }} aria-hidden />
                          {x.l}
                        </dt>
                        <dd className="font-display text-lg leading-none font-bold tabular-nums">{Math.round(x.v)}</dd>
                      </div>
                    ))}
                  </dl>
                  {m.steps.length > 0 && (
                    <details className="group">
                      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-bold text-ink-variant hover:text-ink">
                        How to make it
                        <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden />
                      </summary>
                      <ol className="mt-2 flex list-decimal flex-col gap-1 pl-5 text-sm text-ink-variant">
                        {m.steps.map((s, k) => (
                          <li key={k}>{s}</li>
                        ))}
                      </ol>
                    </details>
                  )}
                  {isLogged ? (
                    <span className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-outline-variant text-sm font-bold text-ink-variant">
                      <Check className="size-4" aria-hidden /> Logged
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => log(m)}
                      disabled={pending}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-outline text-sm font-bold text-ink-variant transition-colors hover:bg-hover hover:text-ink disabled:opacity-60"
                    >
                      {busy === m.meal ? <PlateLoader size="sm" /> : <Plus className="size-4" aria-hidden />}
                      {busy === m.meal ? "Logging…" : "Log this meal"}
                    </button>
                  )}
                </motion.li>
              );
            })}
          </ol>
        )}
      </section>
    </MotionConfig>
  );
}
