"use client";

import { useActionState, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { DIET_LABEL, type Diet } from "@/lib/fit-foods";
import {
  ACTIVITY,
  GOAL_LABEL,
  targets,
  type Activity,
  type FitProfile,
  type Goal,
  type Sex,
} from "@/lib/fit-nutrition";
import { UNIT_COOKIE, fmtWeight, type Unit } from "@/lib/fit-units";
import { saveProfile, type ProfileState } from "./actions";
import { fitBusy, fitError, fitToast } from "@/components/fit/fit-toast";
import { PlateLoader } from "@/components/fit/plate-loader";
import { Dumbo } from "@/components/fit/dumbo";
import type { Mood } from "@/lib/fit-mascot";

const rememberUnit = (u: Unit) => {
  document.cookie = `${UNIT_COOKIE}=${u}; path=/; max-age=31536000; samesite=lax`;
};

/** A row of pill options that behaves like a radio group. */
function Segmented<T extends string>({
  name,
  value,
  options,
  onChange,
  cols,
}: {
  name: string;
  value: T;
  options: { value: T; label: string; hint?: string }[];
  onChange: (v: T) => void;
  cols?: string;
}) {
  return (
    <div role="radiogroup" className={`grid gap-2 ${cols ?? "grid-cols-2"}`}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`flex min-h-12 flex-col items-start justify-center rounded-xl border px-3 py-2 text-left transition-colors ${
              on
                ? "border-ink bg-primary text-primary-foreground"
                : "border-outline text-ink-variant hover:bg-hover hover:text-ink"
            }`}
          >
            <span className="text-sm font-bold">{o.label}</span>
            {o.hint && (
              <span
                className={`text-xs ${on ? "text-primary-foreground/70" : "text-ink-subtle"}`}
              >
                {o.hint}
              </span>
            )}
          </button>
        );
      })}
      <input type="hidden" name={name} value={value} />
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-bold tracking-[0.14em] text-ink-subtle uppercase">
          {label}
        </span>
        {hint && <span className="text-xs text-ink-subtle">{hint}</span>}
      </span>
      {children}
    </div>
  );
}

const inputCls =
  "h-14 w-full rounded-xl border border-outline bg-background px-4 font-display text-3xl font-bold text-ink outline-none transition-colors focus:border-ink";

/**
 * Fit profile. With no profile yet it runs as a 3-step setup (you → goal → habits); afterwards it's
 * one settings form. A live preview shows the calorie and protein targets the inputs produce.
 */
export function ProfileForm({
  profile,
  latestKg,
  today,
  unit: savedUnit,
  account,
}: {
  profile: FitProfile | null;
  latestKg: number | null;
  today: string;
  unit: Unit;
  /** Clear data + log out: its own section under the profile and targets. */
  account?: ReactNode;
}) {
  const router = useRouter();
  const setup = profile === null;
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [unit, setUnitState] = useState<Unit>(savedUnit);
  const [sex, setSex] = useState<Sex>(profile?.sex ?? "male");
  const [birth, setBirth] = useState(String(profile?.birth_year ?? ""));
  const [height, setHeight] = useState(String(profile?.height_cm ?? ""));
  const [activity, setActivity] = useState<Activity>(
    profile?.activity ?? "moderate",
  );
  const [goal, setGoal] = useState<Goal>(profile?.goal ?? "maintain");
  const [target, setTarget] = useState(
    profile?.target_kg ? fmtWeight(profile.target_kg, savedUnit) : "",
  );
  const [rate, setRate] = useState(String(profile?.weekly_rate_kg || 0.5));
  const [diet, setDiet] = useState<Diet>(profile?.diet ?? "nonveg");
  const [gymDays, setGymDays] = useState(profile?.gym_days_target ?? 4);
  // Unsaved changes: the save button wakes up (and pulses) only when something differs from the last save.
  const snapshot = JSON.stringify([unit, sex, birth, height, activity, goal, target, rate, diet, gymDays]);
  const [saved, setSaved] = useState(snapshot);
  const dirty = snapshot !== saved;

  const [state, action, pending] = useActionState<ProfileState, FormData>(
    async (prev, fd) => {
      fitBusy("Saving profile…");
      const r = await saveProfile(prev, fd);
      if (r?.error) fitError(r.error, "Profile not saved");
      if (r?.saved)
        fitToast({
          title: setup ? "Profile set up!" : "Profile saved",
          detail: setup ? "Your coach is ready" : "Targets updated",
          mood: "proud",
        });
      if (r?.saved) setSaved(snapshot);
      if (r?.saved && setup) router.push("/coach");
      return r;
    },
    null,
  );

  const setUnit = (u: Unit) => {
    setUnitState(u);
    rememberUnit(u);
  };

  // Live preview from the current inputs (same formulas the coach uses).
  const preview =
    latestKg && Number(birth) > 1900 && Number(height) >= 100
      ? targets(
          {
            sex,
            birth_year: Number(birth),
            height_cm: Number(height),
            activity,
            goal,
            target_kg: null,
            weekly_rate_kg: Number(rate),
            diet,
            gym_days_target: gymDays,
            water_target_ml: 3000,
          },
          latestKg,
          today,
        )
      : null;

  const sections = [
    {
      title: "You",
      body: (
        <>
          <Field label="Sex" hint="for the calorie formula">
            <Segmented
              name="sex"
              value={sex}
              onChange={setSex}
              options={[
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
              ]}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Birth year">
              <input
                name="birth_year"
                inputMode="numeric"
                value={birth}
                onChange={(e) =>
                  setBirth(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                className={inputCls}
                aria-label="Birth year"
                required
              />
            </Field>
            <Field label="Height" hint="cm">
              <input
                name="height_cm"
                inputMode="decimal"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className={inputCls}
                aria-label="Height in centimetres"
                required
              />
            </Field>
          </div>
          <Field label="Activity" hint="outside the gym too">
            <Segmented
              name="activity"
              value={activity}
              onChange={setActivity}
              cols="grid-cols-1 sm:grid-cols-2"
              options={(Object.keys(ACTIVITY) as Activity[]).map((a) => ({
                value: a,
                label: ACTIVITY[a].label,
                hint: ACTIVITY[a].hint,
              }))}
            />
          </Field>
        </>
      ),
    },
    {
      title: "Goal",
      body: (
        <>
          <Field label="Goal">
            <Segmented
              name="goal"
              value={goal}
              onChange={setGoal}
              cols="grid-cols-3"
              options={(["lose", "maintain", "gain"] as Goal[]).map((g) => ({
                value: g,
                label: GOAL_LABEL[g],
              }))}
            />
          </Field>
          <Field label="Target weight" hint="optional">
            <div className="flex items-center gap-3">
              <input
                name="target"
                inputMode="decimal"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className={inputCls}
                aria-label={`Target weight in ${unit}`}
              />
              <div
                role="radiogroup"
                aria-label="Weight unit"
                className="flex h-14 shrink-0 rounded-xl border border-outline p-1"
              >
                {(["kg", "lb"] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    role="radio"
                    aria-checked={unit === u}
                    onClick={() => setUnit(u)}
                    className={`w-12 rounded-lg text-sm font-bold ${unit === u ? "bg-primary text-primary-foreground" : "text-ink-subtle hover:text-ink"}`}
                  >
                    {u}
                  </button>
                ))}
              </div>
              <input type="hidden" name="unit" value={unit} />
            </div>
          </Field>
          {goal !== "maintain" && (
            <Field label="Pace" hint="per week">
              <Segmented
                name="weekly_rate_kg"
                value={rate}
                onChange={setRate}
                cols="grid-cols-4"
                options={["0.25", "0.5", "0.75", "1"].map((r) => ({
                  value: r,
                  label: `${r} kg`,
                  hint:
                    r === "0.25"
                      ? "gentle"
                      : r === "0.5"
                        ? "steady"
                        : r === "0.75"
                          ? "firm"
                          : "hard",
                }))}
              />
            </Field>
          )}
          {goal === "maintain" && (
            <input type="hidden" name="weekly_rate_kg" value="0" />
          )}
        </>
      ),
    },
    {
      title: "Habits",
      body: (
        <>
          <Field label="Diet">
            <Segmented
              name="diet"
              value={diet}
              onChange={setDiet}
              cols="grid-cols-2 sm:grid-cols-4"
              options={(["vegan", "veg", "egg", "nonveg"] as Diet[]).map(
                (d) => ({ value: d, label: DIET_LABEL[d] }),
              )}
            />
          </Field>
          <Field label="Gym days per week" hint="your target">
            <div className="grid grid-cols-8 gap-1.5" role="radiogroup">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={gymDays === n}
                  onClick={() => setGymDays(n)}
                  className={`h-12 rounded-xl border font-display text-2xl font-bold transition-colors ${gymDays === n ? "border-ink bg-primary text-primary-foreground" : "border-outline text-ink-variant hover:bg-hover"}`}
                >
                  {n}
                </button>
              ))}
            </div>
            <input type="hidden" name="gym_days_target" value={gymDays} />
          </Field>
        </>
      ),
    },
  ];

  const tabs = sections.map((s) => s.title);
  const go = (i: number) => {
    setDir(i > step ? 1 : -1);
    setStep(i);
  };
  const age = Number(birth) > 1900 ? Number(today.slice(0, 4)) - Number(birth) : null;
  const summary = [
    [height ? `${height} cm` : "—", age ? `${age}y` : null].filter(Boolean).join(" · "),
    goal === "maintain" ? GOAL_LABEL[goal] : `${GOAL_LABEL[goal]} · ${rate}/wk`,
    `${DIET_LABEL[diet]} · ${gymDays}d`,
  ];
  const slide = {
    initial: reduce ? { opacity: 0 } : { opacity: 0, x: dir * 36, filter: "blur(6px)" },
    animate: { opacity: 1, x: 0, filter: "blur(0px)" },
    transition: { duration: reduce ? 0.15 : 0.45, ease: EASE },
  };

  return (
    <div className="grid gap-5 md:grid-cols-12 md:items-start md:gap-6">
      <div className="card-in flex flex-col gap-4 md:col-span-7" style={{ "--card-i": 1 } as CSSProperties}>
        {setup ? (
          <ol className="flex gap-2" aria-label="Setup steps">
            {sections.map((s, i) => (
              <li key={s.title} className="flex flex-1 flex-col gap-1.5">
                <span className="relative h-1.5 overflow-hidden rounded-full bg-track">
                  <motion.span
                    className="absolute inset-0 origin-left rounded-full bg-ink"
                    initial={false}
                    animate={{ scaleX: i <= step ? 1 : 0 }}
                    transition={{ duration: reduce ? 0 : 0.5, ease: EASE }}
                  />
                </span>
                <span className={`text-xs font-bold transition-colors ${i === step ? "text-ink" : "text-ink-subtle"}`}>{s.title}</span>
              </li>
            ))}
          </ol>
        ) : (
          /* Tabs: each shows its current answer, so the whole profile reads at a glance. */
          <div role="tablist" aria-label="Profile sections" className="grid grid-cols-3 gap-1 rounded-2xl border border-outline-variant bg-surface p-1">
            {tabs.map((t, i) => {
              const on = i === step;
              return (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  id={`me-tab-${i}`}
                  aria-selected={on}
                  aria-controls={`me-pane-${i}`}
                  onClick={() => go(i)}
                  className={`relative flex min-h-14 min-w-0 flex-col items-center justify-center rounded-xl px-1 py-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${on ? "text-primary-foreground" : "text-ink-variant hover:bg-hover hover:text-ink"}`}
                >
                  {on && (
                    <motion.span
                      layoutId="me-tab"
                      aria-hidden
                      className="absolute inset-0 rounded-xl bg-primary"
                      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span className="relative font-display text-lg leading-none font-bold uppercase">{t}</span>
                  <span className={`relative mt-1 w-full truncate text-center font-mono text-[10px] ${on ? "text-primary-foreground/70" : "text-ink-subtle"}`}>
                    {summary[i]}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <form action={action} className="flex flex-col gap-4">
          {/* Every field stays mounted so the hidden panes still submit; the active one slides in. */}
          {sections.map((s, i) =>
            i === step ? (
              <motion.section
                key={`${s.title}-on`}
                id={`me-pane-${i}`}
                role={setup ? undefined : "tabpanel"}
                aria-labelledby={setup ? undefined : `me-tab-${i}`}
                aria-label={setup ? s.title : undefined}
                {...slide}
                className="flex flex-col gap-5 rounded-2xl border border-outline-variant bg-surface p-4 sm:p-6"
              >
                {setup && <h2 className="font-display text-3xl leading-none font-bold uppercase">{s.title}</h2>}
                {s.body}
              </motion.section>
            ) : (
              <section key={`${s.title}-off`} hidden>
                {s.body}
              </section>
            ),
          )}

          <div className="flex items-center gap-3">
            {setup && step > 0 && (
              <button
                type="button"
                onClick={() => go(step - 1)}
                className="inline-flex h-14 items-center gap-2 rounded-full border border-outline px-5 font-semibold text-ink-variant hover:bg-hover hover:text-ink"
              >
                <ArrowLeft className="size-4" aria-hidden /> Back
              </button>
            )}
            {setup && step < sections.length - 1 ? (
              <button
                type="button"
                onClick={() => go(step + 1)}
                className="group inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-primary font-bold text-primary-foreground hover:bg-primary-hover"
              >
                Next <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </button>
            ) : (
              <motion.button
                type="submit"
                disabled={pending || (!setup && !dirty)}
                animate={dirty && !reduce && !pending ? { scale: [1, 1.025, 1] } : { scale: 1 }}
                transition={dirty && !reduce ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
                className="inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-primary font-bold text-primary-foreground transition-opacity hover:bg-primary-hover disabled:opacity-40"
              >
                {pending ? (
                  <>
                    <PlateLoader size="sm" /> Saving…
                  </>
                ) : setup ? (
                  <>
                    <Check className="size-4" aria-hidden /> Start coaching
                  </>
                ) : dirty ? (
                  <>
                    <span aria-hidden className="size-2 rounded-full bg-primary-foreground" /> Save changes
                  </>
                ) : (
                  <>
                    <Check className="size-4" aria-hidden /> All saved
                  </>
                )}
              </motion.button>
            )}
          </div>
          <p aria-live="polite" className="sr-only">
            {state?.error ?? (state?.saved && !setup ? "Profile saved. Targets updated." : "")}
          </p>
          {state?.error && <p className="text-sm text-ink">{state.error}</p>}
        </form>

      </div>

      {/* Live preview of what these settings mean. Phones: on top, it's the payoff. */}
      <aside
        aria-label="Your daily targets"
        className="card-in order-first flex flex-col gap-4 overflow-hidden rounded-2xl border border-outline-variant bg-surface p-4 sm:p-6 md:sticky md:top-6 md:order-none md:col-span-5"
        style={{ "--card-i": 0 } as CSSProperties}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xs font-bold tracking-[0.14em] text-ink-subtle uppercase">Daily targets</h2>
            {preview ? (
              <p className="mt-2 font-display text-6xl leading-none font-bold" aria-label={`${preview.kcal} kcal a day`}>
                <Num value={preview.kcal} />
                <span className="ml-1 text-xl text-ink-subtle">kcal</span>
              </p>
            ) : (
              <p className="mt-2 font-display text-6xl leading-none font-bold text-ink-subtle">—</p>
            )}
          </div>
          <Dumbo mood={preview ? MOOD[goal] : "curious"} size={84} className="-mt-1 -mr-2 shrink-0" />
        </div>

        {preview ? (
          <>
            {/* Burn vs eat: two bars on one scale instead of a sentence. */}
            <div
              role="img"
              aria-label={`Burn about ${preview.tdee} kcal, eat ${preview.kcal} kcal: ${preview.adjust === 0 ? "maintenance" : `${preview.adjust > 0 ? "+" : ""}${preview.adjust} kcal a day`}${preview.floored ? ", held at a safe minimum" : ""}`}
              className="flex flex-col gap-2"
            >
              {[
                ["Burn", preview.tdee, "bg-steel"],
                ["Eat", preview.kcal, "bg-ink"],
              ].map(([l, v, c]) => (
                <div key={l as string} className="grid grid-cols-[40px_1fr_52px] items-center gap-2">
                  <span className="font-mono text-[11px] text-ink-subtle">{l}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-track">
                    <motion.span
                      className={`block h-full origin-left rounded-full ${c}`}
                      initial={reduce ? false : { scaleX: 0 }}
                      animate={{ scaleX: (v as number) / Math.max(preview.tdee, preview.kcal) }}
                      transition={{ duration: reduce ? 0 : 0.8, ease: EASE }}
                    />
                  </span>
                  <span className="text-right font-mono text-xs tabular-nums">
                    <Num value={v as number} />
                  </span>
                </div>
              ))}
              <span className="self-end rounded-full border border-outline-variant px-2 py-0.5 font-mono text-[11px] text-ink-variant">
                {preview.adjust === 0 ? "maintenance" : `${preview.adjust > 0 ? "+" : "−"}${Math.abs(preview.adjust)}/day`}
                {preview.floored && " · safe min"}
              </span>
            </div>
            <dl className="grid grid-cols-3 divide-x divide-outline-variant border-y border-outline-variant">
              {(
                [
                  ["Protein", preview.protein],
                  ["Carbs", preview.carbs],
                  ["Fiber", preview.fiber],
                ] as const
              ).map(([l, v]) => (
                <div key={l} className="flex flex-col items-center py-3">
                  <dt className="font-mono text-[11px] text-ink-subtle">{l}</dt>
                  <dd className="font-display text-3xl leading-none font-bold">
                    <Num value={v} />
                    <span className="text-sm text-ink-subtle">g</span>
                  </dd>
                </div>
              ))}
            </dl>
            <p
              className="font-mono text-[11px] text-ink-subtle"
              title="Estimates from your last weigh-in; the coach adapts once you log food for 2 weeks."
            >
              from {fmtWeight(latestKg!, unit)} {unit} · estimate
            </p>
          </>
        ) : (
          <p className="font-mono text-xs text-ink-subtle">{latestKg ? "add birth year + height" : "log a weigh-in first"}</p>
        )}
      </aside>

      {account && (
        <section
          aria-label="Account"
          className="card-in mt-4 flex flex-col gap-4 border-t border-outline-variant pt-6 md:col-span-12"
          style={{ "--card-i": 2 } as CSSProperties}
        >
          <h2 className="text-xs font-bold tracking-[0.14em] text-ink-subtle uppercase">Account</h2>
          <div className="grid gap-4 md:grid-cols-12 md:items-start">
            <div className="md:col-span-7">{account}</div>
          </div>
        </section>
      )}
    </div>
  );
}

const EASE = [0.2, 0.9, 0.25, 1] as const;
const MOOD: Record<Goal, Mood> = { lose: "flex", maintain: "happy", gain: "proud" };

/** A number that glides to its new value whenever the inputs change it. */
function Num({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => Math.round(v).toLocaleString("en-US"));
  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const c = animate(mv, value, { duration: 0.7, ease: EASE });
    return () => c.stop();
  }, [value, reduce, mv]);
  return <motion.span className="tabular-nums">{text}</motion.span>;
}
