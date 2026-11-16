import type { Metadata } from "next";
import { Suspense } from "react";
import { CoachMeals } from "@/components/fit/coach-meals";
import { CoachWeek } from "@/components/fit/coach-week";
import { Dumbo } from "@/components/fit/dumbo";
import { getFoodRange, getMealPrep, getProfile, getWeekPlan, getWeights } from "@/lib/fit";
import { mergeWeek, musclesText } from "@/lib/fit-coach-plan";
import { MEALS, type CoreMeal } from "@/lib/fit-foods";
import type { Mood } from "@/lib/fit-mascot";
import { adaptiveTdee, sum, targets } from "@/lib/fit-nutrition";
import { addDays, weekStart } from "@/lib/fit-stats";

export const metadata: Metadata = { title: "Coach" };

export default function CoachPage() {
  return (
    <Suspense fallback={<div className="mt-6 h-[620px] animate-pulse rounded-3xl bg-surface" aria-hidden />}>
      <Coach />
    </Suspense>
  );
}

async function Coach() {
  const [profile, { today, logs }] = await Promise.all([getProfile(), getWeights(120)]);
  const monday = weekStart(today);
  const [plan, prep, food] = await Promise.all([getWeekPlan(monday), getMealPrep(today), getFoodRange(addDays(today, -28), today)]);

  // Training: the plan lined up with what was actually logged.
  const week = mergeWeek(plan, logs, today);
  const gymTarget = Math.max(0, Math.min(6, profile?.gym_days_target ?? 6));

  // Food: today's targets (same rules as the Food page) and what's been eaten.
  const kg = logs[0]?.kg ?? null;
  const perDay = new Map<string, number>();
  food.forEach((e) => perDay.set(e.day, (perDay.get(e.day) ?? 0) + e.kcal));
  const observed = adaptiveTdee([...perDay].map(([day, kcal]) => ({ day, kcal })), logs.map((l) => ({ day: l.day, kg: l.kg })));
  const t = profile && kg ? targets(profile, kg, today, observed?.tdee) : null;
  const todays = food.filter((e) => e.day === today);
  const eaten = sum(todays);
  const loggedMeals = MEALS.flatMap((m): { meal: CoreMeal; kcal: number }[] => {
    const es = todays.filter((e) => e.meal === m);
    return es.length ? [{ meal: m, kcal: es.reduce((s, e) => s + e.kcal, 0) }] : [];
  });

  // What the coach says first.
  const swapped = week.days.find((d) => d.swapped);
  const todayDay = week.days.find((d) => d.day === today);
  let mood: Mood = "happy";
  let line: string;
  if (!plan) {
    line = "Let's plan your week. Tap Generate and I'll pick what to train, Monday to Saturday.";
    mood = "curious";
  } else if (week.needsUpdate && swapped?.planned) {
    line = `${swapped.weekday}: you did ${musclesText(swapped.muscles)} instead of ${musclesText(swapped.planned.muscles)}. Tap Update and I'll re-plan the rest around it.`;
    mood = "thinking";
  } else if (week.needsUpdate) {
    line = "You missed a planned session. Tap Update and I'll fit the rest of the week around it.";
    mood = "thinking";
  } else if (todayDay?.status === "done") {
    line = `${musclesText(todayDay.muscles)} done today. Now let's fuel it. What's in your kitchen?`;
    mood = "proud";
  } else if (todayDay && !todayDay.rest && todayDay.muscles.length) {
    line = `Today is ${musclesText(todayDay.muscles)}. Warm up, then go load the bar.`;
    mood = "flex";
  } else {
    line = "Rest day today. Recovery builds the muscle. Let's sort your meals.";
    mood = "sleepy";
  }

  return (
    <div className="flex flex-col gap-5 pt-6 pb-6 sm:pt-10 md:gap-6">
      {/* Coach hero: Dumbo in his cap, saying what's next. */}
      <section aria-label="Your coach" className="card-in flex flex-col items-center gap-4 sm:flex-row sm:items-end sm:gap-6">
        <div className="relative shrink-0">
          <Dumbo mood={mood} outfit="coach" size={190} />
        </div>
        <div className="flex min-w-0 flex-col gap-3 pb-2">
          <h1 className="font-display text-5xl leading-[0.9] font-bold uppercase sm:text-6xl">
            Coach <span className="text-ink-subtle">Dumbo</span>
          </h1>
          <p className="relative max-w-[46ch] rounded-2xl border border-outline-variant bg-surface px-4 py-3 text-base font-semibold" aria-live="polite">
            <span className="absolute -top-2 left-8 size-4 rotate-45 border-t border-l border-outline-variant bg-surface sm:top-auto sm:-left-2 sm:bottom-5 sm:rotate-[-45deg] sm:border-t sm:border-r-0 sm:border-b-0 sm:border-l" aria-hidden />
            {line}
          </p>
        </div>
      </section>

      <CoachWeek
        days={week.days}
        hasPlan={Boolean(plan)}
        needsUpdate={week.needsUpdate}
        planKey={plan?.generated_at ?? "none"}
        gymTarget={gymTarget}
        completedGym={week.completedGym}
        today={today}
      />

      <CoachMeals
        prep={prep}
        targets={t ? { kcal: t.kcal, protein: t.protein, carbs: t.carbs, fiber: t.fiber } : null}
        eaten={{ kcal: eaten.kcal, protein: eaten.protein, carbs: eaten.carbs, fiber: eaten.fiber }}
        loggedMeals={loggedMeals}
      />
    </div>
  );
}
