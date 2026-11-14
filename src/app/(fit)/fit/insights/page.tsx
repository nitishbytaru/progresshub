import type { Metadata } from "next";
import { Suspense } from "react";
import { BalanceCard, FuelWeightCard, Meter, Panel, StrengthCard, WeekdayCard } from "@/components/fit/insight-cards";
import { MuscleMatrix } from "@/components/fit/muscle-matrix";
import { TrendChart } from "@/components/fit/trend-chart";
import { WeeksRack } from "@/components/fit/weeks-rack";
import { SetupNotice } from "@/components/fit/setup-notice";
import { getFoodRange, getProfile, getSets, getUnit, getWeights, trainerReady } from "@/lib/fit";
import { addDays, analyze } from "@/lib/fit-stats";
import { adherence, balance, fuelVsWeight, muscleMatrix, streaks, strength, weekdayHabits } from "@/lib/fit-insights";
import { adaptiveTdee, targets } from "@/lib/fit-nutrition";

export const metadata: Metadata = { title: "Insights" };

export default function InsightsPage() {
  return (
    <>
      <h1 className="pt-6 pb-6 font-display text-5xl leading-[0.9] font-bold uppercase sm:pt-10 sm:text-6xl">
        Read <span className="text-ink-subtle">the data</span>
      </h1>
      <Suspense fallback={<div className="h-[620px] animate-pulse rounded-2xl bg-surface" aria-hidden />}>
        <Insights />
      </Suspense>
    </>
  );
}

async function Insights() {
  const [{ today, logs, gymBefore }, profile, unit, ready] = await Promise.all([getWeights(), getProfile(), getUnit(), trainerReady()]);
  if (!logs.length) return <SetupNotice title="Nothing to read yet" body="Log weigh-ins and gym days for a week and your insights fill in here." cta={{ href: "/log", label: "Log today" }} />;
  const [food, sets] = await Promise.all([getFoodRange(addDays(today, -60), today), getSets(addDays(today, -56), today)]);

  const perDay = new Map<string, { kcal: number; protein: number }>();
  food.forEach((e) => {
    const d = perDay.get(e.day) ?? { kcal: 0, protein: 0 };
    perDay.set(e.day, { kcal: d.kcal + e.kcal, protein: d.protein + e.protein });
  });
  const observed = adaptiveTdee([...perDay].map(([day, v]) => ({ day, kcal: v.kcal })), logs.map((l) => ({ day: l.day, kg: l.kg })));
  const kg = logs[0]?.kg ?? null;
  const t = profile && kg ? targets(profile, kg, today, observed?.tdee) : null;

  const matrix = muscleMatrix(logs, today);
  const stats = analyze(logs, today, gymBefore);
  const adh = adherence(logs, perDay, today, t, profile?.gym_days_target ?? null);
  const st = streaks(logs, today);
  const str = strength(sets, today);

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-12 md:gap-6 lg:gap-x-10 lg:gap-y-8">
      <div className="min-w-0 md:col-span-12 lg:col-span-8">
        <MuscleMatrix weeks={matrix.weeks} rows={matrix.rows} />
      </div>
      <div className="flex flex-col gap-5 md:col-span-6 lg:col-span-4">
        <BalanceCard {...balance(logs, today)} />
        <WeekdayCard days={weekdayHabits(logs, today)} />
      </div>
      <div className={`md:col-span-6 lg:col-span-8 ${ready ? "" : "hidden"}`}>
        <FuelWeightCard days={fuelVsWeight(logs, perDay, today)} target={t?.kcal ?? null} unit={unit} />
      </div>
      <div className={`md:col-span-12 ${ready ? "lg:col-span-4" : ""}`}>
        <Panel label="Adherence, 30 days" title="Consistency" i={4}>
          <div className="flex flex-col gap-4">
            <Meter label="Weigh-ins" value={adh.weighIns} of={30} />
            {ready && <Meter label="Food logged" value={adh.foodDays} of={30} unit="days" />}
            {t && <Meter label="On calorie target" value={adh.onKcal} of={Math.max(1, adh.foodDays)} unit="days" />}
            {t && <Meter label="Protein hit" value={adh.onProtein} of={Math.max(1, adh.foodDays)} unit="days" />}
            {adh.gymWeeksHit !== null && <Meter label="Gym target weeks" value={adh.gymWeeksHit} of={4} />}
          </div>
          <dl className="grid grid-cols-3 divide-x divide-outline-variant border-t border-outline-variant pt-3 text-center">
            {[
              ["Streak now", st.currentWeighIn, "d"],
              ["Best streak", st.bestWeighIn, "d"],
              ["Best week", st.bestGymWeek, "gym"],
            ].map(([l, v, u]) => (
              <div key={l as string}>
                <dt className="text-xs text-ink-subtle">{l}</dt>
                <dd className="font-display text-2xl font-bold">
                  {v}
                  <span className="text-sm text-ink-subtle"> {u}</span>
                </dd>
              </div>
            ))}
          </dl>
          {observed && t && (
            <p className="border-t border-outline-variant pt-3 text-sm text-ink-variant">
              Measured burn: <span className="font-display text-lg font-bold text-ink">{observed.tdee}</span> kcal/day from {observed.days} logged days. Targets use this, not the formula.
            </p>
          )}
        </Panel>
      </div>
      <TrendChart points={stats.trend} gym={logs.filter((l) => l.gym).map((l) => ({ day: l.day, muscles: l.muscles }))} unit={unit} />
      <div className={`md:col-span-12 ${ready ? "lg:col-span-5" : ""}`}>
        <WeeksRack s={stats} />
      </div>
      <div className={`md:col-span-12 lg:col-span-7 ${ready ? "" : "hidden"}`}>
        <StrengthCard prs={str.prs} volume={str.volume} weeks={str.weeks} unit={unit} />
      </div>
    </div>
  );
}
