import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import {
  MAX_BACKFILL_DAYS,
  getFitDays,
  getSets,
  getWeights,
  lastDays,
  trainerReady,
} from "@/lib/fit";
import { SetLogger } from "@/components/fit/set-logger";
import { e1rm } from "@/lib/fit-exercises";
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
      <Suspense
        fallback={
          <div
            className="h-[420px] animate-pulse rounded-2xl bg-surface"
            aria-hidden
          />
        }
      >
        <Logger />
      </Suspense>
    </>
  );
}

async function Logger() {
  const [{ today, logs, gymBefore }, jar] = await Promise.all([
    getWeights(),
    cookies(),
  ]);
  const saved = jar.get(UNIT_COOKIE)?.value;
  const unit = isUnit(saved) ? saved : "kg";
  const [sets, history, extras, ready] = await Promise.all([
    getSets(today, today),
    getSets(addDays(today, -365), addDays(today, -1)),
    getFitDays(today, today),
    trainerReady(),
  ]);
  const bests: Record<string, number> = {};
  history.forEach(
    (s) =>
      (bests[s.exercise_key] = Math.max(
        bests[s.exercise_key] ?? 0,
        e1rm(s.weight_kg, s.reps),
      )),
  );
  const todayLog = logs.find((l) => l.day === today);
  return (
    <div className="flex flex-col gap-6">
      <WeightLogger
        unit={unit}
        today={today}
        minDay={lastDays(today, MAX_BACKFILL_DAYS + 1)[0]}
        logs={logs}
        gymBefore={gymBefore}
        week={Array.from({ length: 7 }, (_, i) => addDays(weekStart(today), i))}
      />
      {ready && (
        <div className="grid md:grid-cols-12 md:gap-6 lg:gap-10">
          <div className="md:col-span-7">
            <SetLogger
              day={today}
              sets={sets}
              bests={bests}
              unit={unit}
              defaultMuscles={todayLog?.muscles ?? []}
              sleep={extras[0]?.sleep_h ?? null}
              steps={extras[0]?.steps ?? null}
            />
          </div>
        </div>
      )}
    </div>
  );
}
