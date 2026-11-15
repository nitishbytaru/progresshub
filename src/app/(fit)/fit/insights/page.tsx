import type { Metadata } from "next";
import { Suspense } from "react";
import { BalanceCard, WeekdayCard } from "@/components/fit/insight-cards";
import { MuscleMatrix } from "@/components/fit/muscle-matrix";
import { TrendChart } from "@/components/fit/trend-chart";
import { SetupNotice } from "@/components/fit/setup-notice";
import { getProfile, getUnit, getWeights } from "@/lib/fit";
import { analyze } from "@/lib/fit-stats";
import { balance, muscleMatrix, weekdayHabits } from "@/lib/fit-insights";

export const metadata: Metadata = { title: "Insights" };

export default function InsightsPage() {
  return (
    <>
      <h1 className="pt-6 pb-6 font-display text-5xl leading-[0.9] font-bold uppercase sm:pt-10 sm:text-6xl">
        Read <span className="text-ink-subtle">the data</span>
      </h1>
      <Suspense
        fallback={
          <div
            className="h-[620px] animate-pulse rounded-2xl bg-surface"
            aria-hidden
          />
        }
      >
        <Insights />
      </Suspense>
    </>
  );
}

async function Insights() {
  const [{ today, logs, gymBefore }, unit, profile] = await Promise.all([
    getWeights(),
    getUnit(),
    getProfile(),
  ]);
  if (!logs.length)
    return (
      <SetupNotice
        title="Nothing to read yet"
        body="Log weigh-ins and gym days for a week and your insights fill in here."
        cta={{ href: "/log", label: "Log today" }}
      />
    );

  const matrix = muscleMatrix(logs, today);
  const stats = analyze(logs, today, gymBefore);

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-12 md:gap-6 lg:gap-8">
      {/* 1. The headline: weight over time, full width. */}
      <TrendChart
        points={stats.trend}
        gym={logs
          .filter((l) => l.gym)
          .map((l) => ({ day: l.day, muscles: l.muscles }))}
        unit={unit}
        target={
          profile?.goal === "maintain" ? null : (profile?.target_kg ?? null)
        }
      />
      {/* 2. What you train and how often, full width so the drill-down sits beside its stats. */}
      <div className="min-w-0 md:col-span-12">
        <MuscleMatrix weeks={matrix.weeks} rows={matrix.rows} />
      </div>
      {/* 3. Two habit cards, equal height side by side from tablet up. */}
      <div className="flex md:col-span-6 [&>section]:flex-1">
        <BalanceCard {...balance(logs, today)} />
      </div>
      <div className="flex md:col-span-6 [&>section]:flex-1">
        <WeekdayCard days={weekdayHabits(logs, today)} />
      </div>
    </div>
  );
}
