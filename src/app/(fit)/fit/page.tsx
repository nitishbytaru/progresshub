import { Suspense } from "react";
import { cookies } from "next/headers";
import { EmptyHome, WeightBlock } from "@/components/fit/home-cards";
import { BalanceCard, WeekdayCard } from "@/components/fit/insight-cards";
import { MuscleMatrix } from "@/components/fit/muscle-matrix";
import { TrendChart } from "@/components/fit/trend-chart";
import { TrainingBoard } from "@/components/fit/training-board";
import { getProfile, getWeights } from "@/lib/fit";
import { balance, muscleMatrix, weekdayHabits } from "@/lib/fit-insights";
import { analyze } from "@/lib/fit-stats";
import { UNIT_COOKIE, isUnit } from "@/lib/fit-units";

/** Home: the week as a loaded bar, weight and split, then the deeper reads (trend, frequency, balance, weekdays). */
export default function FitHome() {
  return (
    <>
      <h1 className="sr-only">Your training</h1>
      <Suspense
        fallback={
          <div className="flex flex-col gap-5 pt-4" aria-hidden>
            {["h-[190px]", "h-[180px]", "h-[300px]"].map((h) => (
              <div key={h} className={`${h} animate-pulse rounded-2xl bg-surface`} />
            ))}
          </div>
        }
      >
        <Analysis />
      </Suspense>
    </>
  );
}

async function Analysis() {
  const [{ today, logs, gymBefore }, jar] = await Promise.all([getWeights(), cookies()]);
  if (!logs.length) return <EmptyHome />;
  const saved = jar.get(UNIT_COOKIE)?.value;
  const unit = isUnit(saved) ? saved : "kg";
  const s = analyze(logs, today, gymBefore);
  const profile = await getProfile();
  const matrix = muscleMatrix(logs, today);
  return (
    <div className="grid grid-cols-1 gap-5 pt-4 md:grid-cols-12 md:gap-6 lg:gap-x-10 lg:gap-y-8 lg:pt-8">
      <TrainingBoard s={s} unit={unit} today={today} weight={<WeightBlock s={s} unit={unit} />} />

      {/* Insights (formerly their own tab): weight over time, then what you train and when. */}
      <TrendChart
        points={s.trend}
        gym={logs.filter((l) => l.gym).map((l) => ({ day: l.day, muscles: l.muscles }))}
        unit={unit}
        target={profile?.goal === "maintain" ? null : (profile?.target_kg ?? null)}
      />
      <div className="min-w-0 md:col-span-12">
        <MuscleMatrix weeks={matrix.weeks} rows={matrix.rows} />
      </div>
      <div className="flex md:col-span-6 [&>section]:flex-1">
        <BalanceCard {...balance(logs, today)} />
      </div>
      <div className="flex md:col-span-6 [&>section]:flex-1">
        <WeekdayCard days={weekdayHabits(logs, today)} />
      </div>
    </div>
  );
}
