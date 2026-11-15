import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { Apple, CalendarCheck, Dumbbell, Scale } from "lucide-react";
import { CoachChat } from "@/components/fit/coach-chat";
import { MealPlan } from "@/components/fit/meal-plan";
import { WeekPlan } from "@/components/fit/week-plan";
import {
  getFoodRange,
  getProfile,
  getUnit,
  getWeights,
  trainerReady,
} from "@/lib/fit";
import {
  coachTips,
  etaToTarget,
  pace,
  weightTrend,
  type Tip,
} from "@/lib/fit-coach";
import { adaptiveTdee, targets, sum } from "@/lib/fit-nutrition";
import { addDays } from "@/lib/fit-stats";
import { fmtWeight, fromKg } from "@/lib/fit-units";

export const metadata: Metadata = { title: "Coach" };

const utc = (d: string) => new Date(`${d}T00:00:00Z`);
const longDate = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
const TIP_ICON: Record<Tip["kind"], typeof Dumbbell> = {
  train: Dumbbell,
  eat: Apple,
  weight: Scale,
  habit: CalendarCheck,
};
const card =
  "card-in rounded-2xl border border-outline-variant bg-surface p-4 sm:p-6";

export default function CoachPage() {
  return (
    <>
      <h1 className="pt-6 pb-6 font-display text-5xl leading-[0.9] font-bold uppercase sm:pt-10 sm:text-6xl">
        Your <span className="text-ink-subtle">coach</span>
      </h1>
      <Suspense
        fallback={
          <div
            className="h-[620px] animate-pulse rounded-2xl bg-surface"
            aria-hidden
          />
        }
      >
        <Coach />
      </Suspense>
    </>
  );
}

async function Coach() {
  const [ready, profile, { today, logs }, unit] = await Promise.all([
    trainerReady(),
    getProfile(),
    getWeights(),
    getUnit(),
  ]);
  const food = ready ? await getFoodRange(addDays(today, -28), today) : [];
  const kg = logs[0]?.kg ?? null;

  const byDay = new Map<string, typeof food>();
  food.forEach((e) => byDay.set(e.day, [...(byDay.get(e.day) ?? []), e]));
  const foodDays = [...byDay].map(([day, es]) => ({ day, totals: sum(es) }));
  const observed = adaptiveTdee(
    foodDays.map((d) => ({ day: d.day, kcal: d.totals.kcal })),
    logs.map((l) => ({ day: l.day, kg: l.kg })),
  );
  const t = profile && kg ? targets(profile, kg, today, observed?.tdee) : null;
  const p = pace(logs, today);
  const trend = weightTrend(logs, today);
  const eta =
    trend && profile
      ? etaToTarget(trend.avgNow, trend.perWeek, profile.target_kg, today)
      : null;
  const tips = coachTips({
    logs,
    today,
    profile,
    targets: t,
    foodDays,
    trend,
    pace: p,
    ready,
  });
  const target = profile?.gym_days_target ?? null;
  const tipsCard = (span: string) => (
    <section
      aria-label="Coach tips"
      className={`${card} md:self-start ${span}`}
      style={{ "--card-i": 3 } as CSSProperties}
    >
      <h2 className="text-xs font-bold tracking-[0.14em] text-ink-variant uppercase">
        Coach says
      </h2>
      <ul className="mt-3 flex flex-col divide-y divide-outline-variant">
        {tips.length ? (
          tips.map((tip, i) => {
            const Icon = TIP_ICON[tip.kind];
            return (
              <li key={i} className="flex gap-3 py-3">
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-full ${tip.strong ? "bg-primary text-primary-foreground" : "border border-outline text-ink-variant"}`}
                >
                  <Icon className="size-4" aria-hidden />
                </span>
                <p
                  className={`text-sm ${tip.strong ? "font-semibold text-ink" : "text-ink-variant"}`}
                >
                  {tip.text}
                </p>
              </li>
            );
          })
        ) : (
          <li className="py-3 text-sm text-ink-variant">
            You&apos;re on track. Keep logging.
          </li>
        )}
      </ul>
    </section>
  );

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-12 md:gap-6 lg:gap-x-10 lg:gap-y-8">
      {/* Pace: this week and what next week needs. */}
      <section
        aria-label="Gym pace"
        className={`${card} md:col-span-5 md:self-start lg:col-span-4`}
      >
        <h2 className="text-xs font-bold tracking-[0.14em] text-ink-variant uppercase">
          Pace
        </h2>
        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-sm font-semibold text-ink-variant">
            This week
          </span>
          <span className="font-display text-4xl font-bold">
            {p.thisWeek}
            <span className="text-lg text-ink-subtle">
              {" "}
              / {target ?? p.keepPace}
            </span>
          </span>
        </div>
        <p className="mt-1 text-sm text-ink-variant">
          {p.remainingThisWeek > 0
            ? `${p.remainingThisWeek} more gym day${p.remainingThisWeek > 1 ? "s" : ""} keeps your pace.`
            : "On pace this week."}
        </p>
        <dl className="mt-4 grid grid-cols-3 divide-x divide-outline-variant border-y border-outline-variant text-center">
          <div className="py-3">
            <dt className="text-xs text-ink-subtle">4-wk avg</dt>
            <dd className="font-display text-2xl font-bold">{p.avgPerWeek}</dd>
          </div>
          <div className="py-3">
            <dt className="text-xs text-ink-subtle">Your usual</dt>
            <dd className="font-display text-2xl font-bold">
              {p.keepPace}
              <span className="text-sm text-ink-subtle"> d</span>
            </dd>
          </div>
          <div className="py-3">
            <dt className="text-xs text-ink-subtle">Target</dt>
            <dd className="font-display text-2xl font-bold">
              {target ?? "—"}
              {target !== null && (
                <span className="text-sm text-ink-subtle"> d</span>
              )}
            </dd>
          </div>
        </dl>
      </section>

      <div className="md:col-span-7 lg:col-span-8">
        <WeekPlan
          logs={logs}
          today={today}
          keepPace={p.keepPace}
          target={target}
        />
      </div>

      {/* Targets + projection */}
      <section
        aria-label="Daily targets"
        className={`${card} md:col-span-5 md:self-start lg:col-span-4`}
        style={{ "--card-i": 1 } as CSSProperties}
      >
        <h2 className="text-xs font-bold tracking-[0.14em] text-ink-variant uppercase">
          Daily targets
        </h2>
        {t ? (
          <>
            <p className="mt-3 font-display text-5xl leading-none font-bold">
              {t.kcal}
              <span className="ml-1 text-lg text-ink-subtle">kcal</span>
            </p>
            <p className="mt-1 text-sm text-ink-variant">
              Burn ≈ {t.tdee}
              {observed
                ? ` (measured from ${observed.days} logged days)`
                : " (estimated)"}{" "}
              ·{" "}
              {t.adjust === 0
                ? "maintenance"
                : `${t.adjust > 0 ? "+" : ""}${t.adjust}/day`}
            </p>
            <dl className="mt-4 grid grid-cols-3 divide-x divide-outline-variant border-y border-outline-variant text-center">
              {[
                ["Protein", t.protein],
                ["Carbs", t.carbs],
                ["Fiber", t.fiber],
              ].map(([l, v]) => (
                <div key={l} className="py-3">
                  <dt className="text-xs text-ink-subtle">{l}</dt>
                  <dd className="font-display text-2xl font-bold">
                    {v}
                    <span className="text-sm text-ink-subtle">g</span>
                  </dd>
                </div>
              ))}
            </dl>
          </>
        ) : (
          <p className="mt-3 text-sm text-ink-variant">
            {!ready ? (
              "Calorie and macro targets unlock with food tracking, soon."
            ) : kg ? (
              <>
                <Link
                  href="/me"
                  className="font-semibold text-ink underline underline-offset-4"
                >
                  Set up your profile
                </Link>{" "}
                to get calorie and macro targets and a daily meal plan.
              </>
            ) : (
              "Log a weigh-in to get targets."
            )}
          </p>
        )}
        <div className="mt-5 border-t border-outline-variant pt-4">
          <h3 className="text-xs font-bold tracking-[0.14em] text-ink-variant uppercase">
            Projection
          </h3>
          {trend ? (
            <>
              <p className="mt-2 font-display text-3xl font-bold">
                {trend.perWeek > 0 ? "▲" : trend.perWeek < 0 ? "▼" : ""}
                {Math.abs(fromKg(trend.perWeek, unit)).toFixed(1)}{" "}
                <span className="text-base text-ink-subtle">{unit}/week</span>
              </p>
              <p className="mt-1 text-sm text-ink-variant">
                {!ready
                  ? "Your goal-weight date unlocks with your profile."
                  : profile?.target_kg == null
                    ? "Set a target weight on Me to see when you'll reach it."
                    : eta?.reached
                      ? `You're at your target of ${fmtWeight(profile.target_kg, unit)} ${unit}.`
                      : eta
                        ? `${fmtWeight(profile.target_kg, unit)} ${unit} around ${longDate.format(utc(eta.date))} (${eta.weeks} weeks) at this rate.`
                        : `Moving away from ${fmtWeight(profile.target_kg, unit)} ${unit}. Adjust food or training.`}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-ink-subtle">
              Weigh in 4+ times over 3 weeks to see your trend.
            </p>
          )}
        </div>
      </section>

      <div className="md:col-span-7 lg:col-span-8">
        {!ready ? (
          tipsCard("")
        ) : t && profile ? (
          <MealPlan
            kcal={t.kcal}
            protein={t.protein}
            diet={profile.diet}
            today={today}
          />
        ) : (
          <section
            aria-label="Meal plan"
            className={`${card} flex flex-col gap-2`}
          >
            <h2 className="font-display text-3xl font-bold uppercase">
              Eat today
            </h2>
            <p className="text-sm text-ink-variant">
              A full-day meal plan for your diet type appears here once your
              profile is set.
            </p>
          </section>
        )}
      </div>

      {ready && (
        <>
          {tipsCard("md:col-span-5 lg:col-span-4")}
          <div className="md:col-span-7 lg:col-span-8">
            <CoachChat />
          </div>
        </>
      )}
    </div>
  );
}
