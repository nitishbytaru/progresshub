"use client";

import { useMemo, useState, useTransition } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { Minus, PencilLine, Plus, Search, Sparkles } from "lucide-react";
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
import { FoodIcon, foodFor } from "./food-icon";
import {
  DIET_LABEL,
  FOODS,
  FOOD_GROUPS,
  GROUP_ORDER,
  allowedDiets,
  formatQty,
  isCountable,
  servingStep,
  mealLabel,
  searchFoods,
  type Diet,
  type FoodGroup,
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
  targets = null,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  day: string;
  meal: Meal;
  diet: Diet | null;
  custom: CustomFood[];
  recent: Food[];
  /** Daily targets, so the detail view can show how much of the day a food covers. */
  targets?: { protein: number; carbs: number; fiber: number } | null;
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
    fiber: "",
    diet: (diet ?? "veg") as Diet,
  });

  const ok = useMemo(() => new Set(allowedDiets(diet ?? "nonveg")), [diet]);
  const [group, setGroup] = useState<FoodGroup | "all">("all");
  const allowed = useMemo(() => FOODS.filter((f) => ok.has(f.diet)), [ok]);
  const groups = useMemo(() => GROUP_ORDER.filter((g) => allowed.some((f) => f.group === g)), [allowed]);
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
  // Grid: search results while typing, else the picked group (your own foods lead "All").
  const tiles = useMemo<Pick[]>(() => {
    if (q.trim()) return results;
    const list = group === "all" ? GROUP_ORDER.flatMap((g) => allowed.filter((f) => f.group === g)) : allowed.filter((f) => f.group === group);
    return [...(group === "all" ? custom.map((food) => ({ kind: "custom" as const, food })) : []), ...list.map((food) => ({ kind: "builtin" as const, food }))];
  }, [q, results, group, allowed, custom]);

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

  // Which tile was tapped, so its icon grows into the detail view (Recent and the grid share foods).
  const [lid, setLid] = useState("");
  const choose = (p: Pick, from = "grid") => {
    setLid(`${from}-${p.kind === "builtin" ? p.food.key : `c-${p.food.id}`}`);
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

  const describe = (input: string = text) =>
    start(async () => {
      setMsg(null);
      fitToast({
        id: "ai-meal",
        title: "Reading your meal…",
        detail: "Dumbo is doing the maths",
        mood: "thinking",
      });
      const r = await describeMeal(input);
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
        fiber: Number(cf.fiber || 0),
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
        fiber: pick.food.fiber,
      }
    : null;
  const pickFood = pick ? (pick.kind === "builtin" ? pick.food : foodFor({ name: pick.food.name })) : null;
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
      <DialogContent className="max-h-[92dvh] gap-4 overflow-x-hidden overflow-y-auto rounded-2xl border border-outline-variant bg-surface p-5 sm:max-w-xl">
        <div>
          <DialogTitle className="font-display text-3xl font-bold uppercase">
            Add to {mealLabel(meal)}
          </DialogTitle>
          <DialogDescription className="text-sm text-ink-subtle">
            Search the list, describe it, or make your own food.
          </DialogDescription>
        </div>
        <div role="tablist" className="relative flex rounded-full border border-outline p-1">
          {tabBtn("search", "Browse", <Search className="size-4" aria-hidden />)}
          {tabBtn("describe", "Describe", <Sparkles className="size-4" aria-hidden />)}
          {tabBtn("custom", "Custom")}
        </div>

        <LayoutGroup>
          <AnimatePresence mode="popLayout" initial={false}>
            {tab === "search" && !pick && (
              <motion.div
                key="browse"
                className="flex min-w-0 flex-col gap-3"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.22 }}
              >
                <label className="relative flex items-center">
                  <Search className="pointer-events-none absolute left-4 size-4 text-ink-subtle" aria-hidden />
                  <input
                    autoFocus
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search roti, paneer, eggs…"
                    aria-label="Search foods"
                    className="h-12 w-full rounded-xl border border-outline bg-background pr-4 pl-11 text-base outline-none placeholder:text-ink-subtle focus:border-ink"
                  />
                </label>

                {/* Food-group filter. */}
                {!q.trim() && (
                  <div className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="radiogroup" aria-label="Food group">
                    <div className="flex min-w-max gap-1.5">
                      {(["all", ...groups] as const).map((g) => {
                        const on = group === g;
                        return (
                          <button
                            key={g}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            onClick={() => setGroup(g)}
                            className={`relative inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition-colors ${on ? "border-ink text-primary-foreground" : "border-outline text-ink-variant hover:text-ink"}`}
                          >
                            {on && <motion.span layoutId="group-pill" className="absolute inset-0 rounded-full bg-primary" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
                            {g !== "all" && <span className="relative size-2.5 rounded-full" style={{ background: FOOD_GROUPS[g].color }} aria-hidden />}
                            <span className="relative">{g === "all" ? "All" : FOOD_GROUPS[g].label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {!q.trim() && group === "all" && recent.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-bold tracking-[0.14em] text-ink-subtle uppercase">Recent</span>
                    <div className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      <div className="flex min-w-max gap-2">
                        {recent.map((f, i) => (
                          <motion.button
                            key={f.key}
                            type="button"
                            onClick={() => choose({ kind: "builtin", food: f }, "recent")}
                            className="flex w-20 flex-col items-center gap-1.5 rounded-xl p-1.5 text-center hover:bg-hover"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.03 * i }}
                            whileTap={{ scale: 0.94 }}
                          >
                            <motion.span layoutId={`recent-${f.key}`}>
                              <FoodIcon food={f} size={52} />
                            </motion.span>
                            <span className="line-clamp-2 text-[0.6875rem] leading-tight font-semibold">{f.name}</span>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <motion.ul layout className="grid max-h-[46dvh] grid-cols-3 gap-2 overflow-y-auto pr-0.5 sm:grid-cols-4">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {tiles.map((r, i) => {
                      const id = r.kind === "builtin" ? r.food.key : `c-${r.food.id}`;
                      const food = r.kind === "builtin" ? r.food : foodFor({ name: r.food.name });
                      return (
                        <motion.li
                          key={id}
                          layout
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.85 }}
                          transition={{ duration: 0.2, delay: Math.min(i, 18) * 0.012 }}
                        >
                          <motion.button
                            type="button"
                            onClick={() => choose(r)}
                            whileTap={{ scale: 0.95 }}
                            className="flex h-full w-full flex-col items-center gap-1.5 rounded-xl border border-outline-variant bg-background p-2.5 text-center transition-colors hover:border-outline hover:bg-hover"
                          >
                            <motion.span layoutId={`grid-${id}`}>
                              <FoodIcon food={food} size={44} />
                            </motion.span>
                            <span className="line-clamp-2 min-h-[2lh] text-xs leading-tight font-semibold">{r.food.name}</span>
                            <span className="text-[0.6875rem] text-ink-subtle tabular-nums">
                              {Math.round(r.food.kcal * (r.kind === "builtin" ? r.food.portion : 1))} kcal
                              {r.kind === "custom" ? " · yours" : ""}
                            </span>
                          </motion.button>
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                  {q.trim() && !tiles.length && (
                    /* Not in the list: one tap to have the AI estimate it, or to save it as your own food. */
                    <motion.li
                      key="no-match"
                      className="col-span-full flex flex-col gap-2 py-2"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <p className="font-mono text-xs text-ink-subtle">“{q.trim()}” isn&apos;t in the list</p>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          const query = q.trim();
                          reset();
                          setText(query);
                          setTab("describe");
                          describe(query);
                        }}
                        className="flex min-h-14 items-center gap-3 rounded-xl bg-primary px-4 text-left text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
                      >
                        <Sparkles className="size-5 shrink-0" aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold">Estimate “{q.trim()}”</span>
                          <span className="block text-xs text-primary-foreground/70">AI fills the macros, you check them</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const query = q.trim();
                          reset();
                          setCf((c) => ({ ...c, name: query.charAt(0).toUpperCase() + query.slice(1) }));
                          setTab("custom");
                        }}
                        className="flex min-h-14 items-center gap-3 rounded-xl border border-outline px-4 text-left text-ink transition-colors hover:bg-hover"
                      >
                        <PencilLine className="size-5 shrink-0 text-ink-variant" aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold">Save “{q.trim()}” as my food</span>
                          <span className="block text-xs text-ink-subtle">enter the label once, search it any time</span>
                        </span>
                      </button>
                    </motion.li>
                  )}
                </motion.ul>
              </motion.div>
            )}

            {tab === "search" && pick && per && (
              <motion.div
                key="detail"
                className="flex flex-col gap-4"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.22 }}
              >
                <div className="flex items-center gap-4">
                  <motion.span layoutId={lid} transition={{ type: "spring", stiffness: 380, damping: 30 }}>
                    <FoodIcon food={pickFood} size={76} />
                  </motion.span>
                  <div className="min-w-0">
                    <p className="text-xl leading-tight font-bold">{pick.food.name}</p>
                    {pickFood && (
                      <span className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-subtle">
                        <span className="size-2 rounded-full" style={{ background: FOOD_GROUPS[pickFood.group].color }} aria-hidden />
                        {FOOD_GROUPS[pickFood.group].label}
                        {!isCountable(serving) || !serving.startsWith("1 pc") ? ` · 1 serving = ${serving}` : ""}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Stepper value={servings} onChange={setServings} step={servingStep(serving)} format={(v) => formatQty(v, serving)} />
                  <p className="text-right font-display leading-none">
                    <motion.span key={Math.round(per.kcal * servings)} className="inline-block text-4xl font-bold tabular-nums" initial={{ y: -6, opacity: 0.4 }} animate={{ y: 0, opacity: 1 }}>
                      {Math.round(per.kcal * servings)}
                    </motion.span>
                    <span className="ml-1 text-base text-ink-subtle">kcal</span>
                  </p>
                </div>
                {/* Protein, carbs, fiber: grams, and (with targets) how much of the day this covers. */}
                <dl className="grid grid-cols-3 gap-2">
                  {(["protein", "carbs", "fiber"] as const).map((m) => {
                    const g = per[m] * servings;
                    const t = targets?.[m];
                    const share = t ? g / t : 0;
                    return (
                      <div key={m} className="flex flex-col gap-1.5 rounded-xl border border-outline-variant bg-background px-3 py-2.5">
                        <dt className="flex items-center gap-1.5 text-[0.6875rem] font-bold tracking-[0.1em] text-ink-subtle uppercase">
                          <span className="size-2 shrink-0 rounded-full" style={{ background: `var(--macro-${m})` }} aria-hidden />
                          {m}
                        </dt>
                        <dd className="font-display text-xl leading-none font-bold tabular-nums">{Math.round(g * 10) / 10} g</dd>
                        {t ? (
                          <span className="flex items-center gap-1.5" title={`${Math.round(share * 100)}% of your daily ${m}`}>
                            <span className="h-1 flex-1 overflow-hidden rounded-full bg-track" aria-hidden>
                              <motion.span className="block h-full origin-left rounded-full" style={{ background: `var(--macro-${m})` }} initial={{ scaleX: 0 }} animate={{ scaleX: Math.min(1, share) }} transition={{ type: "spring", stiffness: 140, damping: 20 }} />
                            </span>
                            <span className="text-[0.625rem] font-bold text-ink-subtle tabular-nums">{Math.round(share * 100)}%</span>
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </dl>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setPick(null)} className="h-12 rounded-full border border-outline px-5 font-semibold text-ink-variant hover:bg-hover">
                    Back
                  </button>
                  <motion.button
                    type="button"
                    disabled={pending}
                    onClick={add}
                    whileTap={{ scale: 0.97 }}
                    className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-primary font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
                  >
                    {pending ? (
                      <>
                        <PlateLoader size="sm" /> Adding…
                      </>
                    ) : (
                      `Add to ${mealLabel(meal)}`
                    )}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </LayoutGroup>

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
                  onClick={() => describe()}
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
                      <FoodIcon food={p.key ? (FOODS.find((f) => f.key === p.key) ?? null) : foodFor({ name: p.name })} size={34} />
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
              {(["kcal", "protein", "carbs", "fiber"] as const).map((k) => (
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
