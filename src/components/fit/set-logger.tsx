"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Footprints, Minus, Moon, Plus, Repeat2, Trash2 } from "lucide-react";
import { addSet, deleteSet, setExtras } from "@/app/(fit)/fit/log/set-actions";
import type { WorkoutSet } from "@/lib/fit";
import { EXERCISES, EXERCISE_BY_KEY, e1rm } from "@/lib/fit-exercises";
import { MUSCLES, PLATE, fmtWeight, fromKg, muscleLabel, type Muscle, type Unit } from "@/lib/fit-units";

type Last = Record<string, { reps: number; weight_kg: number }>;

/**
 * Today's lifting. Pick a group and exercise; reps and weight start from your last set of it.
 * Every set slides a plate onto the sleeve (the clank); "same again" repeats the last one; deletes
 * can be undone for a few seconds. Plus sleep and steps for recovery.
 */
export function SetLogger({
  day,
  sets,
  bests,
  last,
  unit,
  defaultMuscles,
  sleep,
  steps,
}: {
  day: string;
  sets: WorkoutSet[];
  bests: Record<string, number>;
  last: Last;
  unit: Unit;
  defaultMuscles: Muscle[];
  sleep: number | null;
  steps: number | null;
}) {
  const firstMuscle = defaultMuscles[0] ?? "chest";
  const firstEx = EXERCISES.find((e) => e.muscle === firstMuscle)!.key;
  const startFor = (key: string) => {
    const l = last[key];
    return { reps: String(l?.reps ?? 8), weight: l && l.weight_kg ? fmtWeight(l.weight_kg, unit) : "" };
  };

  const [muscle, setMuscle] = useState<Muscle>(firstMuscle);
  const [exercise, setExerciseState] = useState(firstEx);
  const [reps, setReps] = useState(startFor(firstEx).reps);
  const [weight, setWeight] = useState(startFor(firstEx).weight);
  const [sleepH, setSleepH] = useState(sleep === null ? "" : String(sleep));
  const [stepsN, setStepsN] = useState(steps === null ? "" : String(steps));
  const [msg, setMsg] = useState<string | null>(null);
  const [hidden, setHidden] = useState<string | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pending, start] = useTransition();

  const ex = EXERCISE_BY_KEY.get(exercise)!;
  const step = unit === "lb" ? 5 : 2.5;
  const visible = sets.filter((s) => s.id !== hidden);
  const list = useMemo(() => EXERCISES.filter((e) => e.muscle === muscle), [muscle]);
  const grouped = useMemo(() => {
    const g = new Map<string, WorkoutSet[]>();
    visible.forEach((s) => g.set(s.exercise_key, [...(g.get(s.exercise_key) ?? []), s]));
    return [...g];
  }, [visible]);
  const lastToday = [...visible].reverse().find((s) => s.exercise_key === exercise);

  const setExercise = (key: string) => {
    setExerciseState(key);
    const s = startFor(key);
    setReps(s.reps);
    setWeight(s.weight);
  };
  const needsWeight = !ex.bodyweight && !(Number(weight) > 0);

  const submit = (r = Number(reps), w = Number(weight || 0)) => {
    if (!(r >= 1)) return setMsg("Enter how many reps.");
    if (!ex.bodyweight && !(w > 0)) return setMsg(`Enter the weight for ${ex.name}.`);
    start(async () => {
      const res = await addSet({ day, exercise, reps: r, weight: w, unit });
      setMsg(res.error ?? null);
    });
  };

  const remove = (id: string) => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setHidden(id);
    setMsg(null);
    undoTimer.current = setTimeout(() => {
      start(async () => {
        const r = await deleteSet(id);
        if (r.error) {
          setHidden(null);
          setMsg(r.error);
        }
      });
    }, 5000);
  };
  const undo = () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setHidden(null);
  };

  const field = "h-12 w-full min-w-0 bg-transparent text-center font-display text-2xl font-bold outline-none";
  const stepBtn = "grid size-11 shrink-0 place-items-center rounded-full text-ink-variant hover:bg-hover hover:text-ink";

  return (
    <section aria-label="Sets and recovery" className="card-in flex flex-col gap-5 rounded-2xl border border-outline-variant bg-surface p-4 sm:p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-3xl font-bold uppercase">Sets</h2>
        <span className="text-xs text-ink-subtle">{visible.length} today</span>
      </div>

      {/* Today's sets as plates on a sleeve: each new set clanks on. */}
      <div className="relative flex h-12 items-center rounded-xl bg-background px-2" role="img" aria-label={`${visible.length} sets logged today`}>
        <span className="absolute inset-x-2 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-steel/70" aria-hidden />
        <span className="relative mr-1 h-6 w-1.5 rounded-sm bg-steel" aria-hidden />
        <span className="relative flex items-center gap-[2px]">
          {visible.map((s) => (
            <span key={s.id} className="plate-load h-9 w-2 rounded-[2px]" style={{ background: PLATE[s.muscle].fill, ["--from" as string]: 1, ["--i" as string]: 0 }} />
          ))}
        </span>
        {!visible.length && <span className="relative ml-2 text-xs text-ink-subtle">Empty bar: add your first set</span>}
      </div>

      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Muscle group">
        {MUSCLES.map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={muscle === m}
            onClick={() => {
              setMuscle(m);
              setExercise(EXERCISES.find((e) => e.muscle === m)!.key);
            }}
            className={`inline-flex h-11 items-center gap-2 rounded-full border px-3.5 text-sm font-semibold transition-colors ${
              muscle === m ? "border-ink bg-primary text-primary-foreground" : "border-outline text-ink-variant hover:bg-hover"
            }`}
          >
            <span className="size-2.5 rounded-full ring-1 ring-black/30" style={{ background: PLATE[m].fill }} aria-hidden />
            {muscleLabel(m)}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex flex-col gap-4"
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold tracking-[0.14em] text-ink-subtle uppercase">Exercise</span>
          <select value={exercise} onChange={(e) => setExercise(e.target.value)} className="h-12 rounded-xl border border-outline bg-background px-3 text-base font-semibold outline-none focus:border-ink">
            {list.map((e) => (
              <option key={e.key} value={e.key}>
                {e.name}
                {last[e.key] ? ` · last ${last[e.key].weight_kg ? fmtWeight(last[e.key].weight_kg, unit) : "BW"}×${last[e.key].reps}` : ""}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold tracking-[0.14em] text-ink-subtle uppercase">Reps</span>
            <div className="flex items-center rounded-xl border border-outline bg-background focus-within:border-ink">
              <button type="button" aria-label="One rep fewer" onClick={() => setReps(String(Math.max(1, Number(reps || 1) - 1)))} className={stepBtn}>
                <Minus className="size-4" aria-hidden />
              </button>
              <input aria-label="Reps" inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value.replace(/\D/g, "").slice(0, 3))} className={field} />
              <button type="button" aria-label="One rep more" onClick={() => setReps(String(Math.min(100, Number(reps || 0) + 1)))} className={stepBtn}>
                <Plus className="size-4" aria-hidden />
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold tracking-[0.14em] text-ink-subtle uppercase">{ex.bodyweight ? `Added ${unit}` : `Weight ${unit}`}</span>
            <div className={`flex items-center rounded-xl border bg-background focus-within:border-ink ${msg && needsWeight ? "border-ink" : "border-outline"}`}>
              <button type="button" aria-label={`${step} ${unit} lighter`} onClick={() => setWeight(String(Math.max(0, Number(weight || 0) - step)))} className={stepBtn}>
                <Minus className="size-4" aria-hidden />
              </button>
              <input aria-label={`Weight in ${unit}`} aria-invalid={Boolean(msg && needsWeight)} inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder={ex.bodyweight ? "0" : "—"} className={`${field} placeholder:text-ink-subtle`} />
              <button type="button" aria-label={`${step} ${unit} heavier`} onClick={() => setWeight(String(Number(weight || 0) + step))} className={stepBtn}>
                <Plus className="size-4" aria-hidden />
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button type="submit" disabled={pending} className="h-12 flex-1 rounded-full bg-primary font-bold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50">
            Add set
          </button>
          {lastToday && (
            <button
              type="button"
              disabled={pending}
              onClick={() => submit(lastToday.reps, lastToday.weight_kg ? Number(fromKg(lastToday.weight_kg, unit).toFixed(1)) : 0)}
              className="inline-flex h-12 items-center gap-1.5 rounded-full border border-outline px-4 text-sm font-bold text-ink-variant hover:bg-hover hover:text-ink"
            >
              <Repeat2 className="size-4" aria-hidden /> Same again
            </button>
          )}
        </div>
      </form>

      {grouped.length > 0 && (
        <ul className="flex flex-col divide-y divide-outline-variant border-t border-outline-variant">
          {grouped.map(([key, ss]) => {
            const e = EXERCISE_BY_KEY.get(key);
            return (
              <li key={key} className="py-3">
                <p className="flex items-center gap-2 font-semibold">
                  <span className="size-2.5 rounded-full" style={{ background: e ? PLATE[e.muscle].fill : "var(--steel)" }} aria-hidden />
                  {e?.name ?? key}
                </p>
                <ol className="mt-2 flex flex-wrap gap-2">
                  {ss.map((s) => {
                    const est = e1rm(s.weight_kg, s.reps);
                    const pr = (bests[key] ?? 0) > 0 && est > bests[key];
                    return (
                      <li key={s.id} className="inline-flex items-center gap-2 rounded-full border border-outline py-1 pr-1 pl-3">
                        <span className="font-display text-lg font-bold">
                          {s.weight_kg ? fmtWeight(s.weight_kg, unit) : "Bodyweight"}
                          <span className="text-sm text-ink-subtle"> × {s.reps}</span>
                        </span>
                        {pr && <span className="rounded-full bg-primary px-1.5 text-[0.6875rem] font-bold text-primary-foreground">PR</span>}
                        <button type="button" aria-label={`Delete set ${s.set_no} of ${e?.name ?? key}`} onClick={() => remove(s.id)} className="grid size-9 place-items-center rounded-full text-ink-subtle hover:bg-hover hover:text-ink">
                          <Trash2 className="size-4" aria-hidden />
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

      {/* Recovery */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await setExtras(day, { sleep_h: sleepH ? Number(sleepH) : null, steps: stepsN ? Number(stepsN) : null });
            setMsg(r.error ?? "Recovery saved.");
          });
        }}
        className="grid grid-cols-[1fr_1fr_auto] items-end gap-3 border-t border-outline-variant pt-4"
      >
        <label className="flex flex-col gap-1.5">
          <span className="flex items-center gap-1 text-xs font-bold tracking-[0.14em] text-ink-subtle uppercase">
            <Moon className="size-3.5" aria-hidden /> Sleep h
          </span>
          <input inputMode="decimal" value={sleepH} onChange={(e) => setSleepH(e.target.value)} className="h-12 rounded-xl border border-outline bg-background px-3 font-display text-2xl font-bold outline-none focus:border-ink" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="flex items-center gap-1 text-xs font-bold tracking-[0.14em] text-ink-subtle uppercase">
            <Footprints className="size-3.5" aria-hidden /> Steps
          </span>
          <input inputMode="numeric" value={stepsN} onChange={(e) => setStepsN(e.target.value.replace(/\D/g, "").slice(0, 6))} className="h-12 rounded-xl border border-outline bg-background px-3 font-display text-2xl font-bold outline-none focus:border-ink" />
        </label>
        <button type="submit" disabled={pending} className="h-12 rounded-full border border-outline px-5 font-bold text-ink-variant transition-colors hover:bg-hover hover:text-ink">
          Save
        </button>
      </form>
      <p aria-live="polite" className="-mt-2 min-h-5 text-sm text-ink-variant">
        {msg}
      </p>
    </section>
  );
}
