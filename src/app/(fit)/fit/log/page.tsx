import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { MAX_BACKFILL_DAYS, getWeights, lastDays } from "@/lib/fit";
import { UNIT_COOKIE, isUnit } from "@/lib/fit-units";
import { WeightLogger } from "../weight-logger";

export const metadata: Metadata = { title: "Log" };

export default function FitLog() {
  return (
    <>
      <section className="pt-6 pb-6 sm:pt-10">
        <h1 className="text-[2rem] leading-[2.5rem] font-bold tracking-[-0.03em] sm:text-[2.5rem] sm:leading-[3rem]">
          Weigh in. <span className="text-primary">Every day.</span>
        </h1>
      </section>
      <Suspense fallback={<div className="h-[420px] animate-pulse rounded-3xl bg-surface" aria-hidden />}>
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
      week={lastDays(today, 7)}
    />
  );
}
