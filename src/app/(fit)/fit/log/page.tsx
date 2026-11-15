import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import {
  getCustomExercises,
  getFitDays,
  getProfile,
  getSets,
  getWeights,
  trainerReady,
} from "@/lib/fit";
import { LogFlow } from "@/components/fit/log-flow";
import { LogHistory } from "@/components/fit/log-history";
import { LogStage } from "@/components/fit/log-stage";
import { RecoveryButton } from "@/components/fit/recovery-dialog";
import { SetLogger } from "@/components/fit/set-logger";
import type { FlowGoal } from "@/lib/fit-mascot";
import { e1rm } from "@/lib/fit-exercises";
import { addDays, weekStart } from "@/lib/fit-stats";
import { UNIT_COOKIE, isUnit } from "@/lib/fit-units";

const isGoal = (v: unknown): v is FlowGoal => v === "lose" || v === "maintain" || v === "gain";

export const metadata: Metadata = { title: "Log" };

const HEADING = (
  <h1 className="font-display text-5xl leading-[0.9] font-bold tracking-[-0.01em] uppercase sm:text-6xl">
    Weigh in.
    <br />
    <span className="text-ink-subtle">Load the bar.</span>
  </h1>
);

export default function FitLog() {
  return (
    <Suspense
      fallback={
        <>
          <div className="pt-6 pb-6 sm:pt-10 lg:pb-8">{HEADING}</div>
          <div className="h-[420px] animate-pulse rounded-2xl bg-surface" aria-hidden />
        </>
      }
    >
      <Logger />
    </Suspense>
  );
}

async function Logger() {
  const [{ today, logs, gymBefore }, jar, profile] = await Promise.all([
    getWeights(),
    cookies(),
    getProfile(),
  ]);
  // Goal for Dumbo's verdicts: the profile's, else what the flow remembered in its cookie.
  const cookieGoal = jar.get("fit_goal")?.value;
  const goal = profile?.goal ?? (isGoal(cookieGoal) ? cookieGoal : null);
  const saved = jar.get(UNIT_COOKIE)?.value;
  const unit = isUnit(saved) ? saved : "kg";
  const [sets, history, extras, ready, customEx] = await Promise.all([
    getSets(today, today),
    getSets(addDays(today, -365), addDays(today, -1)),
    getFitDays(today, today),
    trainerReady(),
    getCustomExercises(),
  ]);
  // Last set per exercise (today first, then history) so reps/weight start where you left off.
  const last: Record<string, { reps: number; weight_kg: number }> = {};
  [...history, ...sets].forEach((x) => (last[x.exercise_key] = { reps: x.reps, weight_kg: x.weight_kg }));
  const bests: Record<string, number> = {};
  history.forEach(
    (s) =>
      (bests[s.exercise_key] = Math.max(
        bests[s.exercise_key] ?? 0,
        e1rm(s.weight_kg, s.reps),
      )),
  );
  const todayLog = logs.find((l) => l.day === today);
  // Two panes: the load-the-bar flow with the week beside it, and (sliding in on "Log sets") the sets logger.
  return (
    <LogStage
      heading={HEADING}
      gymToday={Boolean(todayLog?.gym)}
      actions={<RecoveryButton day={today} sleep={extras[0]?.sleep_h ?? null} />}
      weigh={
      <div className="grid grid-cols-1 gap-5 md:grid-cols-12 md:items-start md:gap-6 lg:gap-10">
        <div className="min-w-0 md:col-span-7">
          <LogFlow inline data={{ today, logs, gymBefore, unit, goal, goalFromProfile: Boolean(profile) }} />
        </div>
        <div className="min-w-0 md:col-span-5">
          <LogHistory logs={logs} today={today} unit={unit} week={Array.from({ length: 7 }, (_, i) => addDays(weekStart(today), i))} />
        </div>
      </div>
      }
      sets={
        ready ? (
          <SetLogger
              day={today}
              sets={sets}
              bests={bests}
              last={last}
              unit={unit}
              defaultMuscles={todayLog?.muscles ?? []}
              custom={customEx}
            />
        ) : null
      }
    />
  );
}
