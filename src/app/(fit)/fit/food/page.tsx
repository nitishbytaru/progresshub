import type { Metadata } from "next";
import { Suspense } from "react";
import { DayStrip } from "@/components/fit/day-strip";
import { FoodDiary } from "@/components/fit/food-diary";
import { NotReady } from "@/components/fit/setup-notice";
import { MAX_BACKFILL_DAYS, getCustomFoods, getFoodRange, getProfile, getWeights, trainerReady, validateDay } from "@/lib/fit";
import { FOOD_BY_KEY, type Food, type Meal } from "@/lib/fit-foods";
import { adaptiveTdee, targets } from "@/lib/fit-nutrition";
import { addDays, weekStart } from "@/lib/fit-stats";

export const metadata: Metadata = { title: "Food" };

export default function FoodPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <>
      <h1 className="pt-6 pb-6 font-display text-5xl leading-[0.9] font-bold uppercase sm:pt-10 sm:text-6xl">
        Fuel <span className="text-ink-subtle">the work</span>
      </h1>
      <Suspense fallback={<div className="h-[520px] animate-pulse rounded-2xl bg-surface" aria-hidden />}>
        <Diary searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Diary({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [ready, profile, { today, logs }, query] = await Promise.all([trainerReady(), getProfile(), getWeights(60), searchParams]);
  if (!ready) return <NotReady feature="food" />;
  const asked = typeof query.day === "string" ? query.day : today;
  const day = validateDay(asked, today) ? today : asked;

  // The week picker shows the picked day's week (Mon–Sun); history covers it and the last 4 weeks.
  const mon = weekStart(day);
  const histStart = mon < addDays(today, -28) ? mon : addDays(today, -28);
  const [entries, history, custom] = await Promise.all([getFoodRange(day, day), getFoodRange(histStart, today), getCustomFoods()]);

  // Targets: formula until there's enough intake + weight data for the adaptive (observed) burn.
  const kg = logs[0]?.kg ?? null;
  const byDay = new Map<string, number>();
  history.forEach((e) => byDay.set(e.day, (byDay.get(e.day) ?? 0) + e.kcal));
  const observed = adaptiveTdee(
    [...byDay].map(([d, kcal]) => ({ day: d, kcal })),
    logs.map((l) => ({ day: l.day, kg: l.kg })),
  );
  const t = profile && kg ? targets(profile, kg, today, observed?.tdee) : null;

  // Recent built-in foods (most used in 4 weeks) for one-tap adding.
  const counts = new Map<string, number>();
  history.filter((e) => e.day > addDays(today, -28)).forEach((e) => e.source === "builtin" && e.food_key && counts.set(e.food_key, (counts.get(e.food_key) ?? 0) + 1));
  const recent = [...counts]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([k]) => FOOD_BY_KEY.get(k))
    .filter((f): f is Food => Boolean(f));
  const yesterday = addDays(day, -1);
  const yesterdayMeals = [...new Set(history.filter((e) => e.day === yesterday).map((e) => e.meal))] as Meal[];

  const kcalByDay = new Map<string, number>();
  history.forEach((e) => kcalByDay.set(e.day, (kcalByDay.get(e.day) ?? 0) + e.kcal));
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(mon, i);
    return { day: d, kcal: kcalByDay.get(d) ?? 0 };
  });

  return (
    <div className="flex flex-col gap-5">
      {/* Outside the keyed diary so the selected-day pill glides between days. */}
      <DayStrip
        week={week}
        day={day}
        today={today}
        minDay={addDays(today, -MAX_BACKFILL_DAYS)}
        target={t?.kcal ?? null}
        logged={[...kcalByDay.keys()]}
      />
      <FoodDiary
      key={day}
      day={day}
      entries={entries}
      custom={custom}
      targets={t}
      recent={recent}
      diet={profile?.diet ?? null}
      yesterdayMeals={yesterdayMeals}
      />
    </div>
  );
}
