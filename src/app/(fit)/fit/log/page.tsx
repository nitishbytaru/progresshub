import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { MAX_BACKFILL_DAYS, getWeights, lastDays } from "@/lib/fit";
import { addDays, weekStart } from "@/lib/fit-stats";
import { UNIT_COOKIE, isUnit } from "@/lib/fit-units";
import { WeightLogger } from "../weight-logger";

export const metadata: Metadata = { title: "Log" };

export default function FitLog() {
  return (
    <>
      <section className="pt-6 pb-6 sm:pt-10 lg:pb-8">
        <h1 className="font-display text-5xl leading-[0.9] font-bold tracking-[-0.01em] uppercase sm:text-6xl">
          Weigh in.
          <br />
          <span className="text-ink-subtle">Load the bar.</span>
        </h1>
      </section>
      <Suspense fallback={<div className="h-[420px] animate-pulse rounded-2xl bg-surface" aria-hidden />}>
        <Logger />
      </Suspense>
    </>
  );
}

async function Logger() {
  const [{ today, logs, gymBefore }, jar] = await Promise.all([getWeights(), cookies()]);
  const saved = jar.get(UNIT_COOKIE)?.value;
  return (
    <WeightLogger
      unit={isUnit(saved) ? saved : "kg"}
      today={today}
      minDay={lastDays(today, MAX_BACKFILL_DAYS + 1)[0]}
      logs={logs}
      gymBefore={gymBefore}
      week={Array.from({ length: 7 }, (_, i) => addDays(weekStart(today), i))}
    />
  );
}
