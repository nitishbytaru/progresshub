import type { Metadata } from "next";
import { Suspense } from "react";
import { FoodDiary } from "@/components/fit/food-diary";
import { NotReady } from "@/components/fit/setup-notice";
import { getCustomFoods, getFitDays, getFoodRange, getProfile, getWeights, trainerReady, validateDay } from "@/lib/fit";
import { FOOD_BY_KEY, type Food, type Meal } from "@/lib/fit-foods";
import { adaptiveTdee, targets } from "@/lib/fit-nutrition";
import { addDays } from "@/lib/fit-stats";

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
  if (!ready) return <NotReady />;
  const asked = typeof query.day === "string" ? query.day : today;
  const day = validateDay(asked, today) ? today : asked;

  const [entries, history, custom, days] = await Promise.all([
    getFoodRange(day, day),
    getFoodRange(addDays(today, -28), today),
    getCustomFoods(),
    getFitDays(day, day),
  ]);

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
  history.forEach((e) => e.source === "builtin" && e.food_key && counts.set(e.food_key, (counts.get(e.food_key) ?? 0) + 1));
  const recent = [...counts]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([k]) => FOOD_BY_KEY.get(k))
    .filter((f): f is Food => Boolean(f));
  const yesterday = addDays(day, -1);
  const yesterdayMeals = [...new Set(history.filter((e) => e.day === yesterday).map((e) => e.meal))] as Meal[];

  return (
    <FoodDiary
      key={day}
      day={day}
      today={today}
      entries={entries}
      custom={custom}
      targets={t}
      water={days[0]?.water_ml ?? 0}
      waterTarget={profile?.water_target_ml ?? 3000}
      recent={recent}
      diet={profile?.diet ?? null}
      yesterdayMeals={yesterdayMeals}
    />
  );
}
