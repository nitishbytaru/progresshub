import { Suspense } from "react";
import { cookies } from "next/headers";
import { EmptyHome, GymCard, LoggedCard, MusclesCard, TrendCard, WeightCard } from "@/components/fit/home-cards";
import { getWeights } from "@/lib/fit";
import { analyze } from "@/lib/fit-stats";
import { UNIT_COOKIE, isUnit } from "@/lib/fit-units";

/** Home: the analysis of everything logged (weight, gym, muscles, consistency). */
export default function FitHome() {
  return (
    <>
      <h1 className="pt-6 pb-5 text-[2rem] leading-[2.5rem] font-bold tracking-[-0.03em] sm:pt-10 sm:text-[2.5rem] sm:leading-[3rem]">
        Your <span className="text-primary">progress</span>
      </h1>
      <Suspense
        fallback={
          <div className="flex flex-col gap-4" aria-hidden>
            {["h-[260px]", "h-[300px]", "h-[380px]"].map((h) => (
              <div key={h} className={`${h} animate-pulse rounded-3xl bg-surface`} />
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
  return (
    <div className="flex flex-col gap-4">
      <WeightCard s={s} unit={unit} />
      <TrendCard s={s} unit={unit} />
      <GymCard s={s} today={today} />
      <MusclesCard s={s} />
      <LoggedCard s={s} today={today} loggedDays={new Set(logs.map((l) => l.day))} />
    </div>
  );
}
