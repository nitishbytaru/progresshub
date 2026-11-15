"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AnimatePresence, MotionConfig, animate, motion, useReducedMotion } from "motion/react";
import { Check, ChevronDown, Minus, Plus, Repeat2, Trash2, X } from "lucide-react";
import { addCustomExercise, addSet, deleteSet } from "@/app/(fit)/fit/log/set-actions";
import type { WorkoutSet } from "@/lib/fit";
import { PlateLoader } from "./plate-loader";
import { ExercisePic } from "./exercise-pic";
import { SessionBar } from "./session-bar";
import { fitBusy, fitError, fitToast } from "./fit-toast";
import {
  EXERCISES,
  EXERCISE_INK,
  customKey,
  e1rm,
  toExercises,
  type CustomExerciseRow,
} from "@/lib/fit-exercises";
import {
  MUSCLES,
  PLATE,
  fmtWeight,
  KG_PER_LB,
  fromKg,
  muscleLabel,
  type Muscle,
  type Unit,
} from "@/lib/fit-units";

type Last = Record<string, { reps: number; weight_kg: number }>;

/**
 * Today's lifting. Pick a group and exercise; reps and weight start from your last set of it.
 * Every set slides a plate onto the sleeve (the clank); "same again" repeats the last one; deletes
 * can be undone for a few seconds. (Recovery lives in its own dialog on the Log page.)
 */
export function SetLogger({
  day,
  sets,
  bests,
  last,
  unit,
  defaultMuscles,
  custom = [],
}: {
  day: string;
  sets: WorkoutSet[];
  bests: Record<string, number>;
  last: Last;
  unit: Unit;
  defaultMuscles: Muscle[];
  /** Your own exercises (anything not in the built-in list). */
  custom?: CustomExerciseRow[];
}) {
  const firstMuscle = defaultMuscles[0] ?? "chest";
  const firstEx = EXERCISES.find((e) => e.muscle === firstMuscle)!.key;
  const startFor = (key: string) => {
    const l = last[key];
    return {
      reps: String(l?.reps ?? 8),
      weight: l && l.weight_kg ? fmtWeight(l.weight_kg, unit) : "",
    };
  };

  const [mine, setMine] = useState<CustomExerciseRow[]>(custom);
  // Built-in exercises plus your own, each with its colour.
  const allEx = useMemo(() => [...EXERCISES, ...toExercises(mine)], [mine]);
  const byKey = useMemo(() => new Map(allEx.map((e) => [e.key, e])), [allEx]);
  const [muscle, setMuscle] = useState<Muscle>(firstMuscle);
  const [adding, setAdding] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [newName, setNewName] = useState("");
  const [newBw, setNewBw] = useState(false);
  const [exercise, setExerciseState] = useState(firstEx);
  // The sets being entered: one row each, with its own reps and weight.
  type Row = { id: number; reps: string; weight: string };
  const seq = useRef(1);
  const mk = (r: { reps: string; weight: string }): Row => ({ reps: r.reps, weight: r.weight, id: seq.current++ });
  const [rows, setRows] = useState<Row[]>(() => [{ id: 0, ...startFor(firstEx) }]);
  const setRow = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const [msg, setMsg] = useState<string | null>(null);
  const [hidden, setHidden] = useState<string | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pending, start] = useTransition();
  // Which button started the running action, so only that one shows the loader.
  const [op, setOp] = useState<"add" | null>(null);
  const busyOp = pending ? op : null;

  const ex = byKey.get(exercise)!;
  const step = unit === "lb" ? 5 : 2.5;
  const visible = sets.filter((s) => s.id !== hidden);
  const list = useMemo(
    () => allEx.filter((e) => e.muscle === muscle),
    [allEx, muscle],
  );
  // Six tiles by default (always including the picked one); "Show all" opens the rest.
  const SHOW = 6;
  const shown = showAll || list.length <= SHOW ? list : list.slice(0, SHOW).some((e) => e.key === exercise) ? list.slice(0, SHOW) : [...list.slice(0, SHOW - 1), list.find((e) => e.key === exercise)!];
  const grouped = useMemo(() => {
    const g = new Map<string, WorkoutSet[]>();
    visible.forEach((s) =>
      g.set(s.exercise_key, [...(g.get(s.exercise_key) ?? []), s]),
    );
    return [...g];
  }, [visible]);
  const lastToday = [...visible]
    .reverse()
    .find((s) => s.exercise_key === exercise);

  const setExercise = (key: string) => {
    setExerciseState(key);
    setRows([mk(startFor(key))]);
  };

  // Bodyweight exercises (push-ups, pull-ups, dips…) take optional added weight; empty means bodyweight.
  const submitRows = (list: { reps: string; weight: string }[] = rows) => {
    const parsed = list.map((r) => ({ reps: Number(r.reps), weight: Number(r.weight || 0) }));
    for (const [i, r] of parsed.entries()) {
      if (!(r.reps >= 1)) return setMsg(`Set ${i + 1}: enter how many reps.`);
      if (!ex.bodyweight && !(r.weight > 0)) return setMsg(`Set ${i + 1}: enter the weight for ${ex.name}.`);
    }
    const n = parsed.length;
    setOp("add");
    start(async () => {
      fitBusy(n > 1 ? `Logging ${n} sets…` : "Logging set…");
      const res = await addSet({ day, exercise, unit, sets: parsed });
      setMsg(res.error ?? null);
      if (res.error) return void fitError(res.error, "Sets not saved");
      // Next entry starts from the last set you did.
      setRows([mk(list[list.length - 1])]);
      const toKg = (w: number) => (unit === "lb" ? w * KG_PER_LB : w);
      const pr = !ex.bodyweight && (bests[exercise] ?? 0) > 0 && parsed.some((r) => e1rm(toKg(r.weight), r.reps) > bests[exercise]);
      fitToast({
        title: pr ? `New PR on ${ex.name}!` : n > 1 ? `${n} sets logged: ${ex.name}` : `Set logged: ${ex.name}`,
        detail: parsed.map((r) => `${r.reps}×${r.weight ? r.weight : "BW"}`).join(" · "),
        mood: pr ? "shocked" : "flex",
        tint: ex.color,
      });
    });
  };

  const remove = (id: string) => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setHidden(id);
    setMsg(null);
    undoTimer.current = setTimeout(() => {
      start(async () => {
        fitBusy("Removing set…");
        const r = await deleteSet(id);
        if (r.error) {
          setHidden(null);
          setMsg(r.error);
          fitError(r.error, "Couldn't remove that set");
        } else {
          const gone = sets.find((x) => x.id === id);
          const goneEx = gone
            ? byKey.get(gone.exercise_key)
            : undefined;
          fitToast({
            title: "Set removed",
            detail: goneEx?.name,
            mood: "sad",
            tint: goneEx?.color,
          });
        }
      });
    }, 5000);
  };
  const undo = () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setHidden(null);
  };

  const saveExercise = () => {
    const name = newName.trim();
    if (name.length < 2) return setMsg("Give the exercise a name.");
    start(async () => {
      fitBusy("Saving exercise…");
      const r = await addCustomExercise({ name, muscle, bodyweight: newBw });
      if (r.error || !r.exercise) {
        setMsg(r.error ?? "Couldn't save that exercise.");
        fitError(r.error ?? "Couldn't save that exercise.");
        return;
      }
      const row = r.exercise;
      setMine((cur) => [...cur, row]);
      setExerciseState(customKey(row.id));
      setRows([mk({ reps: "8", weight: "" })]);
      setAdding(false);
      setNewName("");
      setNewBw(false);
      setMsg(null);
      fitToast({ title: `Added ${row.name}`, detail: `${muscleLabel(row.muscle)} · ready to log`, mood: "proud", tint: PLATE[row.muscle].fill });
    });
  };

  const totalVolume = visible.reduce((v, s) => v + fromKg(s.weight_kg, unit) * s.reps, 0);
  const lastHere = last[exercise];
  const bestHere = bests[exercise];
  const label = "text-xs font-bold tracking-[0.14em] text-ink-subtle uppercase";
  const field = "h-12 w-full min-w-0 bg-transparent text-center font-display text-xl font-bold outline-none sm:text-2xl";
  const stepBtn = "grid size-8 shrink-0 place-items-center rounded-full text-ink-variant hover:bg-hover hover:text-ink sm:size-10";

  return (
    <MotionConfig reducedMotion="user">
    <div id="sets" className="grid scroll-mt-6 grid-cols-1 gap-5 md:grid-cols-12 md:items-start md:gap-6 lg:gap-8">
      {/* Add a set */}
      <section aria-label="Add a set" className="card-in flex min-w-0 flex-col gap-5 rounded-2xl border border-outline-variant bg-surface p-4 sm:p-6 md:col-span-7">
        <h2 className="font-display text-3xl leading-none font-bold uppercase">Add a set</h2>

        {/* Muscle: six plate faces. */}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6" role="radiogroup" aria-label="Muscle group">
          {MUSCLES.map((m) => {
            const on = muscle === m;
            return (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => {
                  setMuscle(m);
                  setExercise(EXERCISES.find((e) => e.muscle === m)!.key);
                  setAdding(false);
                  setShowAll(false);
                }}
                className={`flex flex-col items-center gap-1.5 rounded-xl border py-2.5 transition-colors ${on ? "border-ink bg-hover" : "border-outline-variant hover:bg-hover"}`}
              >
                {/* A bumper plate face: rim, hub and a notch so the spin reads. */}
                <motion.span
                  className="relative grid size-11 place-items-center rounded-full shadow-[inset_0_0_0_3px_rgb(0_0_0/0.28)]"
                  style={{ background: PLATE[m].fill }}
                  initial={false}
                  animate={{ rotate: on ? 180 : 0, scale: on ? 1.08 : 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 18 }}
                  aria-hidden
                >
                  <span className="absolute top-1 h-1.5 w-1 rounded-full bg-black/30" />
                  <span className="size-3 rounded-full bg-background shadow-[0_0_0_2px_rgb(0_0_0/0.25)]" />
                </motion.span>
                <span className={`text-xs font-bold ${on ? "text-ink" : "text-ink-variant"}`}>{muscleLabel(m)}</span>
              </button>
            );
          })}
        </div>

        {/* Exercise: every option for the group as chips in its own colour. */}
        <div className="flex flex-col gap-2">
          <span className={label}>Exercise</span>
          <motion.div layout className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Exercise">
            {shown.map((e, i) => {
              const on = e.key === exercise;
              const l = last[e.key];
              return (
                <motion.button
                  key={e.key}
                  layout
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setExercise(e.key)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(i, 8) * 0.03, ease: [0.16, 1, 0.3, 1] }}
                  whileTap={{ scale: 0.97 }}
                  className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-background text-left transition-colors ${on ? "border-transparent" : "border-outline-variant hover:border-outline"}`}
                >
                  {/* Photo: the picked one moves through the exercise. */}
                  <span className="relative block">
                    <ExercisePic ex={e} move={on} className={`aspect-[3/2] w-full !rounded-none transition-[filter] duration-300 ${on ? "" : "grayscale-[35%] group-hover:grayscale-0"}`} />
                    <span className="absolute inset-x-0 bottom-0 h-1" style={{ background: e.color }} aria-hidden />
                    {on && (
                      <motion.span
                        className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full shadow-[0_2px_6px_rgb(0_0_0/0.4)]"
                        style={{ background: e.color, color: EXERCISE_INK }}
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 20 }}
                        aria-hidden
                      >
                        <Check className="size-3.5" strokeWidth={3} />
                      </motion.span>
                    )}
                  </span>
                  <span className="flex min-h-14 flex-col justify-center gap-0.5 px-2.5 py-2">
                    <span className={`line-clamp-2 text-sm leading-tight font-bold ${on ? "text-ink" : "text-ink-variant"}`}>{e.name}</span>
                    <span className="text-[0.6875rem] text-ink-subtle tabular-nums">
                      {l ? `last ${l.weight_kg ? fmtWeight(l.weight_kg, unit) : "BW"} × ${l.reps}` : e.bodyweight ? "bodyweight" : "new"}
                    </span>
                  </span>
                  {/* The selection ring glides from tile to tile in each exercise's colour. */}
                  {on && (
                    <motion.span
                      layoutId={`ex-ring-${muscle}`}
                      className="pointer-events-none absolute inset-0 rounded-2xl"
                      initial={false}
                      animate={{ boxShadow: `inset 0 0 0 2.5px ${e.color}` }}
                      transition={{ type: "spring", stiffness: 480, damping: 36 }}
                      aria-hidden
                    />
                  )}
                </motion.button>
              );
            })}
            <motion.button
              layout
              type="button"
              onClick={() => setAdding((a) => !a)}
              aria-expanded={adding}
              className={`flex min-h-32 flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed text-sm font-bold transition-colors ${
                adding ? "border-ink text-ink" : "border-outline text-ink-variant hover:bg-hover hover:text-ink"
              }`}
            >
              <span className="grid size-9 place-items-center rounded-full border border-current">
                {adding ? <X className="size-4" aria-hidden /> : <Plus className="size-4" aria-hidden />}
              </span>
              {adding ? "Cancel" : "Add exercise"}
            </motion.button>
          </motion.div>
          {list.length > SHOW && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="inline-flex h-9 w-fit items-center gap-1.5 self-center rounded-full px-3 text-xs font-bold text-ink-variant hover:bg-hover hover:text-ink"
            >
              {showAll ? "Show fewer" : `Show all ${list.length}`}
              <ChevronDown className={`size-3.5 transition-transform ${showAll ? "rotate-180" : ""}`} aria-hidden />
            </button>
          )}
          {adding && (
            <div className="flex flex-col gap-2 rounded-xl border border-outline-variant bg-background p-3">
              <label className="flex flex-col gap-1.5">
                <span className={label}>New {muscleLabel(muscle).toLowerCase()} exercise</span>
                <input
                  autoFocus
                  value={newName}
                  maxLength={60}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      saveExercise();
                    }
                  }}
                  placeholder="e.g. Ring dips"
                  className="h-11 rounded-xl border border-outline bg-surface px-3 font-semibold outline-none placeholder:text-ink-subtle focus:border-ink"
                />
              </label>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink-variant">
                  <input type="checkbox" checked={newBw} onChange={(e) => setNewBw(e.target.checked)} className="size-4 accent-[var(--chalk)]" />
                  Bodyweight exercise
                </label>
                <button
                  type="button"
                  disabled={pending || newName.trim().length < 2}
                  onClick={saveExercise}
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
                >
                  Save exercise
                </button>
              </div>
            </div>
          )}
          {/* History for the picked exercise. */}
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-subtle">
            <span className="inline-flex items-center gap-1.5 font-bold text-ink">
              <span className="size-2.5 rounded-full" style={{ background: ex.color }} aria-hidden />
              {ex.name}
            </span>
            <span>
              Last time:{" "}
              <span className="font-semibold text-ink-variant">
                {lastHere ? `${lastHere.weight_kg ? `${fmtWeight(lastHere.weight_kg, unit)} ${unit}` : "Bodyweight"} × ${lastHere.reps}` : "first time"}
              </span>
            </span>
            {bestHere ? (
              <span>
                Best est. 1RM: <span className="font-semibold text-ink-variant">{fmtWeight(bestHere, unit)} {unit}</span>
              </span>
            ) : null}
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitRows();
          }}
          className="flex flex-col gap-4"
        >
          {/* One row per set: reps and weight each editable. */}
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-[1.75rem_minmax(0,1fr)_minmax(0,1fr)_2.25rem] items-center gap-2 px-0.5" aria-hidden>
              <span className={label}>Set</span>
              <span className={label}>Reps</span>
              <span className={label}>{ex.bodyweight ? `+${unit}` : unit}</span>
              <span />
            </div>
            <ol className="flex flex-col">
              <AnimatePresence initial={false}>
              {rows.map((r, i) => (
                <motion.li
                  key={r.id}
                  layout
                  initial={{ opacity: 0, height: 0, x: -12 }}
                  animate={{ opacity: 1, height: "auto", x: 0 }}
                  exit={{ opacity: 0, height: 0, x: 12 }}
                  transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                  className="grid grid-cols-[1.75rem_minmax(0,1fr)_minmax(0,1fr)_2.25rem] items-center gap-2 overflow-hidden pb-2"
                >
                  <span className="grid h-10 w-7 place-items-center rounded-[5px] font-display text-sm font-bold shadow-[inset_0_0_0_2px_rgb(0_0_0/0.25)] transition-colors" style={{ background: ex.color, color: EXERCISE_INK }}>
                    {i + 1}
                  </span>
                  <div className="flex h-12 items-center rounded-xl border border-outline bg-background focus-within:border-ink">
                    <button type="button" aria-label={`Set ${i + 1}: one rep fewer`} onClick={() => setRow(i, { reps: String(Math.max(1, Number(r.reps || 1) - 1)) })} className={stepBtn}>
                      <Minus className="size-3.5" aria-hidden />
                    </button>
                    <input
                      aria-label={`Set ${i + 1} reps`}
                      inputMode="numeric"
                      value={r.reps}
                      onChange={(e) => setRow(i, { reps: e.target.value.replace(/\D/g, "").slice(0, 3) })}
                      className={field}
                    />
                    <button type="button" aria-label={`Set ${i + 1}: one rep more`} onClick={() => setRow(i, { reps: String(Math.min(100, Number(r.reps || 0) + 1)) })} className={stepBtn}>
                      <Plus className="size-3.5" aria-hidden />
                    </button>
                  </div>
                  <div className="flex h-12 items-center rounded-xl border border-outline bg-background focus-within:border-ink">
                    <button type="button" aria-label={`Set ${i + 1}: ${step} ${unit} lighter`} onClick={() => setRow(i, { weight: String(Math.max(0, Number(r.weight || 0) - step)) })} className={stepBtn}>
                      <Minus className="size-3.5" aria-hidden />
                    </button>
                    <input
                      aria-label={`Set ${i + 1} ${ex.bodyweight ? "added weight" : "weight"} in ${unit}`}
                      inputMode="decimal"
                      value={r.weight}
                      onChange={(e) => setRow(i, { weight: e.target.value.replace(/[^\d.]/g, "").slice(0, 6) })}
                      placeholder={ex.bodyweight ? "BW" : "—"}
                      className={`${field} placeholder:text-ink-subtle`}
                    />
                    <button type="button" aria-label={`Set ${i + 1}: ${step} ${unit} heavier`} onClick={() => setRow(i, { weight: String(Number(r.weight || 0) + step) })} className={stepBtn}>
                      <Plus className="size-3.5" aria-hidden />
                    </button>
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove set ${i + 1}`}
                    disabled={rows.length === 1}
                    onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
                    className="grid size-9 place-items-center rounded-full text-ink-subtle hover:bg-hover hover:text-ink disabled:invisible"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </motion.li>
              ))}
              </AnimatePresence>
            </ol>
            <button
              type="button"
              disabled={rows.length >= 10}
              onClick={() => setRows((rs) => [...rs, mk(rs[rs.length - 1])])}
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-dashed border-outline text-sm font-bold text-ink-variant transition-colors hover:border-ink-subtle hover:bg-hover hover:text-ink disabled:opacity-40"
            >
              <Plus className="size-4" aria-hidden /> Add set
            </button>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              aria-busy={busyOp === "add"}
              className="inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-primary text-lg font-bold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {busyOp === "add" ? (
                <>
                  <PlateLoader size="sm" /> Logging…
                </>
              ) : rows.length > 1 ? (
                `Log ${rows.length} sets`
              ) : (
                "Log set"
              )}
            </button>
            {lastToday && (
              <button
                type="button"
                disabled={pending}
                onClick={() => submitRows([{ reps: String(lastToday.reps), weight: lastToday.weight_kg ? fromKg(lastToday.weight_kg, unit).toFixed(1) : "" }])}
                className="inline-flex h-14 items-center gap-1.5 rounded-full border border-outline px-4 text-sm font-bold text-ink-variant hover:bg-hover hover:text-ink"
              >
                <Repeat2 className="size-4" aria-hidden /> Same again
              </button>
            )}
          </div>
          <p aria-live="polite" className="-mt-2 min-h-5 text-sm text-ink-variant">
            {msg}
          </p>
        </form>
      </section>

      <div className="flex min-w-0 flex-col gap-5 md:sticky md:top-6 md:col-span-5">
        {/* Today's session */}
        <section aria-label="Today's session" className="card-in flex flex-col gap-4 rounded-2xl border border-outline-variant bg-surface p-4 sm:p-5" style={{ ["--card-i" as string]: 1 }}>
          <h2 className="font-display text-2xl leading-none font-bold uppercase">Today&apos;s session</h2>
          <dl className="grid grid-cols-3 divide-x divide-outline-variant rounded-xl border border-outline-variant bg-background">
            {[
              { l: "Sets", v: visible.length },
              { l: "Exercises", v: grouped.length },
              { l: `Volume ${unit}`, v: Math.round(totalVolume) },
            ].map((x) => (
              <div key={x.l} className="flex flex-col items-center gap-1 py-3">
                <dt className="text-[0.6875rem] font-bold tracking-wide text-ink-subtle uppercase">{x.l}</dt>
                <dd className="font-display text-4xl leading-none font-bold tabular-nums">
                  <Roll to={x.v} />
                </dd>
              </div>
            ))}
          </dl>
          {/* The focal piece: today's sets loaded on a real bar, plate height by weight. */}
          <SessionBar sets={visible} byKey={byKey} unit={unit} />

          {grouped.length > 0 && (
            <ul className="flex flex-col divide-y divide-outline-variant">
              {grouped.map(([key, ss]) => {
                const e = byKey.get(key);
                return (
                  <li key={key} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                    <p className="flex items-center justify-between gap-2">
                      <span className="inline-flex min-w-0 items-center gap-2 font-semibold">
                        {e ? (
                          <span className="rounded-[0.6rem] p-[2px]" style={{ background: e.color }} aria-hidden>
                            <ExercisePic ex={e} className="aspect-[3/2] w-11 !rounded-lg" />
                          </span>
                        ) : (
                          <span className="size-3 shrink-0 rounded-full bg-steel" aria-hidden />
                        )}
                        <span className="truncate">{e?.name ?? key}</span>
                      </span>
                      <span className="shrink-0 text-xs text-ink-subtle">
                        {ss.length} set{ss.length === 1 ? "" : "s"}
                      </span>
                    </p>
                    <ol className="flex flex-wrap gap-1.5">
                      {ss.map((s, i) => {
                        const est = e1rm(s.weight_kg, s.reps);
                        const pr = (bests[key] ?? 0) > 0 && est > bests[key];
                        return (
                          <li key={s.id} className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-background py-0.5 pr-0.5 pl-2.5">
                            <span className="text-[0.625rem] font-bold text-ink-subtle">{i + 1}</span>
                            <span className="font-display text-base font-bold tabular-nums">
                              {s.weight_kg ? fmtWeight(s.weight_kg, unit) : "BW"}
                              <span className="text-ink-subtle"> × {s.reps}</span>
                            </span>
                            {pr && <span className="rounded-full bg-primary px-1.5 text-[0.625rem] font-bold text-primary-foreground">PR</span>}
                            <button
                              type="button"
                              aria-label={`Delete set ${s.set_no} of ${e?.name ?? key}`}
                              onClick={() => remove(s.id)}
                              className="grid size-8 place-items-center rounded-full text-ink-subtle hover:bg-hover hover:text-ink"
                            >
                              <Trash2 className="size-3.5" aria-hidden />
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                  </li>
                );
              })}
            </ul>
          )}

          {hidden && (
            <div className="flex items-center justify-between rounded-xl border border-outline bg-surface-high px-4 py-2" role="status">
              <span className="text-sm">Set removed</span>
              <button type="button" onClick={undo} className="h-9 rounded-full px-3 text-sm font-bold underline-offset-4 hover:underline">
                Undo
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
    </MotionConfig>
  );
}

/** Counts from the previous value to the new one (instant under reduced motion). */
function Roll({ to }: { to: number }) {
  const reduce = useReducedMotion();
  const el = useRef<HTMLSpanElement>(null);
  const prev = useRef(to);
  useEffect(() => {
    const node = el.current;
    const from = prev.current;
    prev.current = to;
    if (reduce || !node || from === to) return;
    const c = animate(from, to, { duration: 0.8, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => (node.textContent = Math.round(v).toLocaleString()) });
    return () => c.stop();
  }, [to, reduce]);
  return <span ref={el}>{to.toLocaleString()}</span>;
}
