"use client";

import { useActionState, useState, type ReactNode } from "react";
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
}: {
  profile: FitProfile | null;
  latestKg: number | null;
  today: string;
  unit: Unit;
}) {
  const router = useRouter();
  const setup = profile === null;
  const [step, setStep] = useState(0);
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

  const visible = setup ? [sections[step]] : sections;

  return (
    <form action={action} className="grid gap-6 md:grid-cols-12 md:items-start">
      <div className="flex flex-col gap-5 md:col-span-7">
        {setup && (
          <ol className="flex gap-2" aria-label="Setup steps">
            {sections.map((s, i) => (
              <li key={s.title} className="flex flex-1 flex-col gap-1.5">
                <span
                  className={`h-1.5 rounded-full ${i <= step ? "bg-ink" : "bg-track"}`}
                />
                <span
                  className={`text-xs font-bold ${i === step ? "text-ink" : "text-ink-subtle"}`}
                >
                  {s.title}
                </span>
              </li>
            ))}
          </ol>
        )}
        {/* Keep every field mounted so hidden steps still submit. */}
        {sections.map((s) => (
          <section
            key={s.title}
            aria-label={s.title}
            hidden={!visible.includes(s)}
            className="flex flex-col gap-5 rounded-2xl border border-outline-variant bg-surface p-4 sm:p-6"
          >
            {!setup && (
              <h2 className="font-display text-2xl font-bold uppercase">
                {s.title}
              </h2>
            )}
            {s.body}
          </section>
        ))}

        <div className="flex items-center gap-3">
          {setup && step > 0 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="inline-flex h-14 items-center gap-2 rounded-full border border-outline px-5 font-semibold text-ink-variant hover:bg-hover hover:text-ink"
            >
              <ArrowLeft className="size-4" aria-hidden /> Back
            </button>
          )}
          {setup && step < sections.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-primary font-bold text-primary-foreground hover:bg-primary-hover"
            >
              Next <ArrowRight className="size-4" aria-hidden />
            </button>
          ) : (
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-primary font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
            >
              {!pending && <Check className="size-4" aria-hidden />}
              {pending ? (
                <>
                  <PlateLoader size="sm" /> Saving…
                </>
              ) : setup ? (
                "Start coaching"
              ) : (
                "Save profile"
              )}
            </button>
          )}
        </div>
        <p aria-live="polite" className="min-h-5 text-sm text-ink-variant">
          {state?.error ??
            (state?.saved && !setup ? "Profile saved. Targets updated." : "")}
        </p>
      </div>

      {/* Live preview of what these settings mean. */}
      <aside
        aria-label="Your daily targets"
        className="flex flex-col gap-4 rounded-2xl border border-outline-variant p-4 sm:p-6 md:sticky md:top-6 md:col-span-5"
      >
        <h2 className="text-xs font-bold tracking-[0.14em] text-ink-subtle uppercase">
          Daily targets
        </h2>
        {preview ? (
          <>
            <p className="font-display text-6xl leading-none font-bold">
              {preview.kcal}
              <span className="ml-1 text-xl text-ink-subtle">kcal</span>
            </p>
            <p className="text-sm text-ink-variant">
              Burn ≈ {preview.tdee} kcal ·{" "}
              {preview.adjust === 0
                ? "eat at maintenance"
                : `${preview.adjust > 0 ? "+" : ""}${preview.adjust} kcal/day`}
              {preview.floored && " (held at a safe minimum)"}
            </p>
            <dl className="grid grid-cols-3 divide-x divide-outline-variant border-y border-outline-variant">
              {[
                ["Protein", preview.protein],
                ["Carbs", preview.carbs],
                ["Fat", preview.fat],
              ].map(([l, v]) => (
                <div key={l} className="flex flex-col items-center py-3">
                  <dt className="text-xs text-ink-subtle">{l}</dt>
                  <dd className="font-display text-2xl font-bold">
                    {v}
                    <span className="text-sm text-ink-subtle">g</span>
                  </dd>
                </div>
              ))}
            </dl>
            <p className="text-xs text-ink-subtle">
              From your last weigh-in ({fmtWeight(latestKg!, unit)} {unit}).
              Estimates; the coach adapts once you log food for 2 weeks.
            </p>
          </>
        ) : (
          <p className="text-sm text-ink-subtle">
            {latestKg
              ? "Fill in birth year and height to see your targets."
              : "Log a weigh-in first; targets are based on your current weight."}
          </p>
        )}
      </aside>
    </form>
  );
}
