import { Suspense } from "react";
import { cookies } from "next/headers";
import { EmptyHome, WeightBlock } from "@/components/fit/home-cards";
import { TrainingBoard } from "@/components/fit/training-board";
import { getFoodRange, getProfile, getWeights, trainerReady } from "@/lib/fit";
import { CoachStrip } from "@/components/fit/coach-strip";
import { coachTips, nextWeekPlan, pace, weightTrend } from "@/lib/fit-coach";
import { adaptiveTdee, sum, targets } from "@/lib/fit-nutrition";
import { addDays } from "@/lib/fit-stats";
import { analyze } from "@/lib/fit-stats";
import { UNIT_COOKIE, isUnit } from "@/lib/fit-units";

/** Home: the week as a loaded bar, then weight, split, weekly load, trend and consistency. */
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
  const [ready, profile, food] = await Promise.all([trainerReady(), getProfile(), getFoodRange(addDays(today, -28), today)]);
  const byDay = new Map<string, typeof food>();
  food.forEach((e) => byDay.set(e.day, [...(byDay.get(e.day) ?? []), e]));
  const foodDays = [...byDay].map(([day, es]) => ({ day, totals: sum(es) }));
  const observed = adaptiveTdee(foodDays.map((d) => ({ day: d.day, kcal: d.totals.kcal })), logs.map((l) => ({ day: l.day, kg: l.kg })));
  const t = profile ? targets(profile, logs[0].kg, today, observed?.tdee) : null;
  const p = pace(logs, today);
  const tips = coachTips({ logs, today, profile, targets: t, foodDays, trend: weightTrend(logs, today), pace: p, ready });
  const tip = tips.find((x) => x.kind !== "train") ?? null;
  // Due: groups never trained, else the one that has waited longest (same rule as the Split tiles).
  const never = s.muscles.filter((m) => m.daysAgo === null && s.muscles.some((x) => x.lastDay));
  const longest = Math.max(...s.muscles.map((m) => m.daysAgo ?? -1));
  const due = (never.length ? never : s.muscles.filter((m) => m.daysAgo === longest && longest >= 0)).map((m) => m.muscle);
  const todayLog = logs.find((l) => l.day === today && l.gym);
  const strip = (
    <CoachStrip
      ready={ready}
      due={due}
      trainedToday={todayLog ? todayLog.muscles : null}
      totals={sum(byDay.get(today) ?? [])}
      targets={t}
      plan={nextWeekPlan(logs, today, profile?.gym_days_target ?? p.keepPace)}
      tip={tip}
    />
  );
  return (
    <div className="grid grid-cols-1 gap-5 pt-4 md:grid-cols-12 md:gap-6 lg:gap-x-10 lg:gap-y-8 lg:pt-8">
      <TrainingBoard s={s} unit={unit} today={today} weight={<WeightBlock s={s} unit={unit} />} after={strip} />
    </div>
  );
}
