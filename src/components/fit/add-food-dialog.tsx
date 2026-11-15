"use client";

import { useMemo, useState, useTransition } from "react";
import { Minus, Plus, Search, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  addCustomFood,
  addFood,
  addParsed,
  describeMeal,
} from "@/app/(fit)/fit/food/actions";
import type { CustomFood } from "@/lib/fit";
import type { ParsedFood } from "@/lib/fit-ai";
import { fitBusy, fitError, fitToast } from "./fit-toast";
import {
  DIET_LABEL,
  FOODS,
  allowedDiets,
  formatQty,
  isCountable,
  isLiquid,
  servingStep,
  mealLabel,
  searchFoods,
  type Diet,
  type Food,
  type Meal,
} from "@/lib/fit-foods";
import { PlateLoader } from "@/components/fit/plate-loader";

type Tab = "search" | "describe" | "custom";
type Pick =
  { kind: "builtin"; food: Food } | { kind: "custom"; food: CustomFood };


export function Stepper({
  value,
  onChange,
  step,
  format,
}: {
  value: number;
  onChange: (v: number) => void;
  step: number;
  /** Show the amount in its unit instead of a servings count (e.g. "250 ml"). */
  format?: (v: number) => string;
}) {
  const snap = (v: number) => Math.round(v * 100) / 100;
  return (
    <div className="flex items-center gap-1 rounded-full border border-outline p-1">
      <button
        type="button"
        aria-label="Fewer servings"
        onClick={() => onChange(snap(Math.max(step, value - step)))}
        className="grid size-10 place-items-center rounded-full text-ink-variant hover:bg-hover hover:text-ink"
      >
        <Minus className="size-4" aria-hidden />
      </button>
      <span className={`text-center font-display font-bold tabular-nums ${format ? "min-w-16 text-xl" : "w-12 text-2xl"}`}>
        {format ? format(value) : value}
      </span>
      <button
        type="button"
        aria-label="More servings"
        onClick={() => onChange(snap(Math.min(20, value + step)))}
        className="grid size-10 place-items-center rounded-full text-ink-variant hover:bg-hover hover:text-ink"
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}

/** Add food to one meal: search the list (+ your foods), describe it for the AI, or create a custom food. */
export function AddFoodDialog({
  open,
  onOpenChange,
  day,
  meal,
  diet,
  custom,
  recent,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  day: string;
  meal: Meal;
  diet: Diet | null;
  custom: CustomFood[];
  recent: Food[];
}) {
  const [tab, setTab] = useState<Tab>("search");
  const [q, setQ] = useState("");
  const [pick, setPick] = useState<Pick | null>(null);
  const [servings, setServings] = useState(1);
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<(ParsedFood & { on: boolean })[] | null>(
    null,
  );
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [cf, setCf] = useState({
    name: "",
    serving_label: "1 serving",
    kcal: "",
    protein: "",
    carbs: "",
    fat: "",
    diet: (diet ?? "veg") as Diet,
  });

  const ok = useMemo(() => new Set(allowedDiets(diet ?? "nonveg")), [diet]);
  const results = useMemo(() => {
    const builtin = searchFoods(
      q,
      FOODS.filter((f) => ok.has(f.diet)),
      25,
    ).map((food) => ({ kind: "builtin" as const, food }));
    const mine = q.trim()
      ? custom
          .filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase()))
          .map((food) => ({ kind: "custom" as const, food }))
      : [];
    return [...mine, ...builtin];
  }, [q, custom, ok]);

  const reset = () => {
    setPick(null);
    setServings(1);
    setParsed(null);
    setText("");
    setMsg(null);
  };
  const close = () => {
    reset();
    setQ("");
    onOpenChange(false);
  };

  const choose = (p: Pick) => {
    setPick(p);
    // Built-in foods open on their usual amount (a glass of milk = 250 ml).
    setServings(p.kind === "builtin" ? p.food.portion : 1);
    setMsg(null);
  };

  const add = () =>
    pick &&
    start(async () => {
      fitBusy("Adding food…");
      const r = await addFood({
        day,
        meal,
        servings,
        ...(pick.kind === "builtin"
          ? { key: pick.food.key }
          : { customId: pick.food.id }),
      });
      if (r.error) {
        setMsg(r.error);
        fitError(r.error);
      } else {
        fitToast({
          title: `Added ${pick.food.name}`,
          detail: `${mealLabel(meal)} · ${Math.round(pick.food.kcal * servings)} kcal`,
          mood: "happy",
        });
        close();
      }
    });

  const describe = () =>
    start(async () => {
      setMsg(null);
      fitToast({
        id: "ai-meal",
        title: "Reading your meal…",
        detail: "Dumbo is doing the maths",
        mood: "thinking",
      });
      const r = await describeMeal(text);
      if (r.error) {
        setMsg(r.error);
        fitError(r.error, "Couldn't read that", "ai-meal");
      } else {
        const n = r.items?.length ?? 0;
        fitToast({
          id: "ai-meal",
          title: `Found ${n} item${n === 1 ? "" : "s"}`,
          detail: "Check them, then add",
          mood: "proud",
        });
        setParsed((r.items ?? []).map((i) => ({ ...i, on: true })));
      }
    });

  const saveParsed = () =>
    parsed &&
    start(async () => {
      const on = parsed.filter((p) => p.on);
      fitBusy("Adding items…");
      const r = await addParsed(day, meal, on);
      if (r.error) {
        setMsg(r.error);
        fitError(r.error);
      } else {
        fitToast({
          title: `Added ${on.length} item${on.length === 1 ? "" : "s"} to ${mealLabel(meal)}`,
          detail: `${Math.round(on.reduce((s, p) => s + p.kcal, 0))} kcal`,
          mood: "flex",
        });
        close();
      }
    });

  const saveCustom = () =>
    start(async () => {
      fitBusy("Saving your food…");
      const r = await addCustomFood({
        name: cf.name,
        serving_label: cf.serving_label,
        kcal: Number(cf.kcal),
        protein: Number(cf.protein || 0),
        carbs: Number(cf.carbs || 0),
        fat: Number(cf.fat || 0),
        diet: cf.diet,
      });
      if (r.error) {
        setMsg(r.error);
        fitError(r.error);
      } else {
        fitToast({
          title: `Saved ${cf.name}`,
          detail: "It's in your foods now. Search it to add.",
          mood: "proud",
        });
        setMsg(`${cf.name} saved to your foods. Search it to add.`);
        setTab("search");
        setQ(cf.name);
      }
    });

  const per = pick
    ? {
        kcal: pick.food.kcal,
        protein: pick.food.protein,
        carbs: pick.food.carbs,
        fat: pick.food.fat,
      }
    : null;
  const serving = pick
    ? pick.kind === "builtin"
      ? pick.food.serving
      : pick.food.serving_label
    : "";
  const tabBtn = (t: Tab, label: string, icon?: React.ReactNode) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === t}
      onClick={() => {
        setTab(t);
        reset();
      }}
      className={`inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full text-sm font-bold transition-colors ${tab === t ? "bg-primary text-primary-foreground" : "text-ink-variant hover:text-ink"}`}
    >
      {icon}
      {label}
    </button>
  );
  const numIn =
    "h-12 w-full rounded-xl border border-outline bg-background px-3 font-display text-2xl font-bold outline-none focus:border-ink";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => (o ? onOpenChange(true) : close())}
    >
      <DialogContent className="max-h-[88dvh] gap-4 overflow-y-auto rounded-2xl border border-outline-variant bg-surface p-5 sm:max-w-lg">
        <div>
          <DialogTitle className="font-display text-3xl font-bold uppercase">
            Add to {mealLabel(meal)}
          </DialogTitle>
          <DialogDescription className="text-sm text-ink-subtle">
            Search the list, describe it, or make your own food.
          </DialogDescription>
        </div>
        <div
          role="tablist"
          className="flex rounded-full border border-outline p-1"
        >
          {tabBtn(
            "search",
            "Search",
            <Search className="size-4" aria-hidden />,
          )}
          {tabBtn(
            "describe",
            "Describe",
            <Sparkles className="size-4" aria-hidden />,
          )}
          {tabBtn("custom", "Custom")}
        </div>

        {tab === "search" && !pick && (
          <div className="flex flex-col gap-3">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search roti, paneer, eggs…"
              aria-label="Search foods"
              className="h-12 rounded-xl border border-outline bg-background px-4 text-base outline-none placeholder:text-ink-subtle focus:border-ink"
            />
            {!q.trim() && recent.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold tracking-[0.14em] text-ink-subtle uppercase">
                  Recent
                </span>
                <div className="flex flex-wrap gap-2">
                  {recent.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => choose({ kind: "builtin", food: f })}
                      className="rounded-full border border-outline px-3 py-1.5 text-sm font-semibold text-ink-variant hover:bg-hover hover:text-ink"
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <ul className="flex max-h-[42dvh] flex-col divide-y divide-outline-variant overflow-y-auto">
              {results.map((r) => (
                <li
                  key={r.kind + (r.kind === "builtin" ? r.food.key : r.food.id)}
                >
                  <button
                    type="button"
                    onClick={() => choose(r)}
                    className="flex w-full items-center justify-between gap-3 px-1 py-3 text-left hover:bg-hover"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">
                        {r.food.name}
                      </span>
                      <span className="text-xs text-ink-subtle">
                        {r.kind === "builtin"
                          ? r.food.serving
                          : r.food.serving_label}
                        {r.kind === "custom" && " · your food"}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-display text-xl font-bold">
                        {Math.round(r.food.kcal)}
                      </span>
                      <span className="text-xs text-ink-subtle">
                        {Math.round(r.food.protein)} g protein
                      </span>
                    </span>
                  </button>
                </li>
              ))}
              {q.trim() && !results.length && (
                <li className="py-4 text-sm text-ink-subtle">
                  No match. Try Describe, or add it as a Custom food.
                </li>
              )}
            </ul>
          </div>
        )}

        {tab === "search" && pick && per && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-lg font-bold">{pick.food.name}</p>
              <p className="text-sm text-ink-subtle">
                <span className="font-semibold text-ink">
                  {formatQty(servings, serving)}
                </span>
                {isCountable(serving) && serving.startsWith("1 pc")
                  ? ""
                  : ` · 1 serving = ${serving}`}
              </p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <Stepper
                value={servings}
                onChange={setServings}
                step={servingStep(serving)}
                format={isLiquid(serving) ? (v) => formatQty(v, serving) : undefined}
              />
              <p className="text-right font-display leading-none">
                <span className="text-4xl font-bold">
                  {Math.round(per.kcal * servings)}
                </span>
                <span className="ml-1 text-base text-ink-subtle">kcal</span>
              </p>
            </div>
            <dl className="grid grid-cols-3 divide-x divide-outline-variant border-y border-outline-variant text-center">
              {(["protein", "carbs", "fat"] as const).map((m) => (
                <div key={m} className="py-2.5">
                  <dt className="text-xs text-ink-subtle capitalize">{m}</dt>
                  <dd className="font-display text-xl font-bold">
                    {Math.round(per[m] * servings * 10) / 10} g
                  </dd>
                </div>
              ))}
            </dl>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPick(null)}
                className="h-12 rounded-full border border-outline px-5 font-semibold text-ink-variant hover:bg-hover"
              >
                Back
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={add}
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-primary font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
              >
                {pending ? (
                  <>
                    <PlateLoader size="sm" /> Adding…
                  </>
                ) : (
                  `Add to ${mealLabel(meal)}`
                )}
              </button>
            </div>
          </div>
        )}

        {tab === "describe" && (
          <div className="flex flex-col gap-3">
            {!parsed ? (
              <>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, 300))}
                  rows={3}
                  placeholder="e.g. 2 rotis, dal and a bowl of curd"
                  aria-label="Describe what you ate"
                  className="rounded-xl border border-outline bg-background p-4 text-base outline-none placeholder:text-ink-subtle focus:border-ink"
                />
                <button
                  type="button"
                  disabled={pending || !text.trim()}
                  onClick={describe}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
                >
                  {!pending && <Sparkles className="size-4" aria-hidden />}
                  {pending ? (
                    <>
                      <PlateLoader size="sm" /> Reading your meal…
                    </>
                  ) : (
                    "Estimate"
                  )}
                </button>
                <p className="text-xs text-ink-subtle">
                  AI estimate. You check every item before it&apos;s saved;
                  foods in our list use our values.
                </p>
              </>
            ) : (
              <>
                <ul className="flex flex-col divide-y divide-outline-variant">
                  {parsed.map((p, i) => (
                    <li key={i} className="flex items-center gap-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={p.on}
                        onChange={() =>
                          setParsed(
                            parsed.map((x, j) =>
                              j === i ? { ...x, on: !x.on } : x,
                            ),
                          )
                        }
                        aria-label={`Include ${p.name}`}
                        className="size-5 accent-[var(--chalk)]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">
                          {p.name}
                        </span>
                        <span className="text-xs text-ink-subtle">
                          {formatQty(p.servings, p.serving_label)}
                          {p.key ? " · from list" : " · estimate"}
                        </span>
                      </span>
                      <span className="font-display text-xl font-bold">
                        {Math.round(p.kcal)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex items-baseline justify-between border-t border-outline-variant pt-3">
                  <span className="text-sm font-semibold text-ink-variant">
                    Total
                  </span>
                  <span className="font-display text-3xl font-bold">
                    {Math.round(
                      parsed
                        .filter((p) => p.on)
                        .reduce((s, p) => s + p.kcal, 0),
                    )}{" "}
                    <span className="text-base text-ink-subtle">kcal</span>
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setParsed(null)}
                    className="h-12 rounded-full border border-outline px-5 font-semibold text-ink-variant hover:bg-hover"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={pending || !parsed.some((p) => p.on)}
                    onClick={saveParsed}
                    className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-primary font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
                  >
                    {pending ? (
                      <>
                        <PlateLoader size="sm" /> Adding…
                      </>
                    ) : (
                      `Add ${parsed.filter((p) => p.on).length} to ${mealLabel(meal)}`
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {tab === "custom" && (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold tracking-[0.14em] text-ink-subtle uppercase">
                Name
              </span>
              <input
                value={cf.name}
                onChange={(e) => setCf({ ...cf, name: e.target.value })}
                className="h-12 rounded-xl border border-outline bg-background px-4 outline-none focus:border-ink"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold tracking-[0.14em] text-ink-subtle uppercase">
                Serving
              </span>
              <input
                value={cf.serving_label}
                onChange={(e) =>
                  setCf({ ...cf, serving_label: e.target.value })
                }
                className="h-12 rounded-xl border border-outline bg-background px-4 outline-none focus:border-ink"
              />
            </label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(["kcal", "protein", "carbs", "fat"] as const).map((k) => (
                <label key={k} className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold tracking-[0.14em] text-ink-subtle uppercase">
                    {k === "kcal" ? "kcal" : `${k} g`}
                  </span>
                  <input
                    inputMode="decimal"
                    value={cf[k]}
                    onChange={(e) => setCf({ ...cf, [k]: e.target.value })}
                    className={numIn}
                  />
                </label>
              ))}
            </div>
            <div
              className="grid grid-cols-2 gap-2 sm:grid-cols-4"
              role="radiogroup"
              aria-label="Diet type"
            >
              {(["vegan", "veg", "egg", "nonveg"] as Diet[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={cf.diet === d}
                  onClick={() => setCf({ ...cf, diet: d })}
                  className={`h-10 rounded-full border text-sm font-bold ${cf.diet === d ? "border-ink bg-primary text-primary-foreground" : "border-outline text-ink-variant hover:bg-hover"}`}
                >
                  {DIET_LABEL[d]}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={pending || !cf.name.trim() || !cf.kcal}
              onClick={saveCustom}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
            >
              {pending ? (
                <>
                  <PlateLoader size="sm" /> Saving…
                </>
              ) : (
                "Save food"
              )}
            </button>
          </div>
        )}

        <p aria-live="polite" className="min-h-5 text-sm text-ink-variant">
          {msg}
        </p>
      </DialogContent>
    </Dialog>
  );
}
