"use client";

import { useMemo, useState, useTransition } from "react";
import { Moon, Footprints, Trash2 } from "lucide-react";
import { addSet, deleteSet, setExtras } from "@/app/(fit)/fit/log/set-actions";
import type { WorkoutSet } from "@/lib/fit";
import { EXERCISES, EXERCISE_BY_KEY, e1rm } from "@/lib/fit-exercises";
import { MUSCLES, PLATE, fmtWeight, muscleLabel, type Muscle, type Unit } from "@/lib/fit-units";

/**
 * Today's lifting: pick a group, an exercise, then add sets (reps × weight). Each set shows its
 * estimated 1RM and a PR mark when it beats your previous best. Plus sleep and steps for the day.
 */
export function SetLogger({
  day,
  sets,
  bests,
  unit,
  defaultMuscles,
  sleep,
  steps,
}: {
  day: string;
  sets: WorkoutSet[];
  bests: Record<string, number>;
  unit: Unit;
  defaultMuscles: Muscle[];
  sleep: number | null;
  steps: number | null;
}) {
  const [muscle, setMuscle] = useState<Muscle>(defaultMuscles[0] ?? "chest");
  const [exercise, setExercise] = useState<string>(() => EXERCISES.find((e) => e.muscle === (defaultMuscles[0] ?? "chest"))!.key);
  const [reps, setReps] = useState("8");
  const [weight, setWeight] = useState("");
  const [sleepH, setSleepH] = useState(sleep === null ? "" : String(sleep));
  const [stepsN, setStepsN] = useState(steps === null ? "" : String(steps));
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const list = useMemo(() => EXERCISES.filter((e) => e.muscle === muscle), [muscle]);
  const grouped = useMemo(() => {
    const g = new Map<string, WorkoutSet[]>();
    sets.forEach((s) => g.set(s.exercise_key, [...(g.get(s.exercise_key) ?? []), s]));
    return [...g];
  }, [sets]);
  const run = (fn: () => Promise<{ error?: string }>, ok?: string) =>
    start(async () => {
      const r = await fn();
      setMsg(r.error ?? ok ?? null);
    });
  const field = "h-12 w-full rounded-xl border border-outline bg-background px-3 font-display text-2xl font-bold outline-none focus:border-ink";

  return (
    <section aria-label="Sets and recovery" className="card-in flex flex-col gap-5 rounded-2xl border border-outline-variant bg-surface p-4 sm:p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-3xl font-bold uppercase">Sets</h2>
        <span className="text-xs text-ink-subtle">{sets.length} today</span>
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
            className={`inline-flex h-10 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition-colors ${muscle === m ? "border-transparent" : "border-outline text-ink-variant hover:bg-hover"}`}
            style={muscle === m ? { background: PLATE[m].fill, color: PLATE[m].ink } : undefined}
          >
            {muscle !== m && <span className="size-2.5 rounded-full" style={{ background: PLATE[m].fill }} aria-hidden />}
            {muscleLabel(m)}
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-bold tracking-[0.14em] text-ink-subtle uppercase">Exercise</span>
        <select value={exercise} onChange={(e) => setExercise(e.target.value)} className="h-12 rounded-xl border border-outline bg-background px-3 text-base font-semibold outline-none focus:border-ink">
          {list.map((e) => (
            <option key={e.key} value={e.key}>
              {e.name}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold tracking-[0.14em] text-ink-subtle uppercase">Reps</span>
          <input inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value.replace(/\D/g, "").slice(0, 3))} className={field} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold tracking-[0.14em] text-ink-subtle uppercase">Weight ({unit})</span>
          <input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder={EXERCISE_BY_KEY.get(exercise)?.bodyweight ? "0" : undefined} className={field} />
        </label>
        <button
          type="button"
          disabled={pending || !reps}
          onClick={() => run(() => addSet({ day, exercise, reps: Number(reps), weight: Number(weight || 0), unit }), "Set added.")}
          className="h-12 rounded-full bg-primary px-5 font-bold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          Add set
        </button>
      </div>

      {grouped.length > 0 && (
        <ul className="flex flex-col divide-y divide-outline-variant border-t border-outline-variant">
          {grouped.map(([key, ss]) => {
            const ex = EXERCISE_BY_KEY.get(key);
            return (
              <li key={key} className="py-3">
                <p className="flex items-center gap-2 font-semibold">
                  <span className="size-2.5 rounded-full" style={{ background: ex ? PLATE[ex.muscle].fill : "var(--steel)" }} aria-hidden />
                  {ex?.name ?? key}
                </p>
                <ol className="mt-2 flex flex-wrap gap-2">
                  {ss.map((s) => {
                    const est = e1rm(s.weight_kg, s.reps);
                    const pr = (bests[key] ?? 0) > 0 && est > bests[key];
                    return (
                      <li key={s.id} className="inline-flex items-center gap-2 rounded-full border border-outline py-1 pr-1 pl-3">
                        <span className="font-display text-lg font-bold">
                          {s.weight_kg ? `${fmtWeight(s.weight_kg, unit)}` : "BW"}
                          <span className="text-sm text-ink-subtle"> × {s.reps}</span>
                        </span>
                        {pr && <span className="rounded-full bg-primary px-1.5 text-[0.625rem] font-bold text-primary-foreground">PR</span>}
                        <button type="button" aria-label={`Delete set ${s.set_no}`} disabled={pending} onClick={() => run(() => deleteSet(s.id))} className="grid size-7 place-items-center rounded-full text-ink-subtle hover:bg-hover hover:text-ink">
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

      {/* Recovery inputs */}
      <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-3 border-t border-outline-variant pt-4">
        <label className="flex flex-col gap-1.5">
          <span className="flex items-center gap-1 text-xs font-bold tracking-[0.14em] text-ink-subtle uppercase">
            <Moon className="size-3.5" aria-hidden /> Sleep h
          </span>
          <input inputMode="decimal" value={sleepH} onChange={(e) => setSleepH(e.target.value)} className={field} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="flex items-center gap-1 text-xs font-bold tracking-[0.14em] text-ink-subtle uppercase">
            <Footprints className="size-3.5" aria-hidden /> Steps
          </span>
          <input inputMode="numeric" value={stepsN} onChange={(e) => setStepsN(e.target.value.replace(/\D/g, "").slice(0, 6))} className={field} />
        </label>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => setExtras(day, { sleep_h: sleepH ? Number(sleepH) : null, steps: stepsN ? Number(stepsN) : null }), "Saved.")}
          className="h-12 rounded-full border border-outline px-5 font-bold text-ink-variant transition-colors hover:bg-hover hover:text-ink"
        >
          Save
        </button>
      </div>
      <p aria-live="polite" className="-mt-2 min-h-5 text-sm text-ink-variant">
        {msg}
      </p>
    </section>
  );
}
