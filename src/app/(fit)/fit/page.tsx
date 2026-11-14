import { Suspense } from "react";
import { cookies } from "next/headers";
import { ArrowUpRight } from "lucide-react";
import { FitGlyph } from "@/components/fit/fit-glyph";
import { MAX_BACKFILL_DAYS, getWeights, lastDays } from "@/lib/fit";
import { UNIT_COOKIE, isUnit } from "@/lib/fit-units";
import { WeightLogger } from "./weight-logger";

const MAIN_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function FitHome() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-4 pb-10 sm:px-6">
      <header className="flex h-16 items-center justify-between">
        <span className="flex items-center gap-2 text-primary">
          <FitGlyph className="size-6" />
          <span className="text-base font-bold tracking-[-0.015em] text-ink">
            progresshub <span className="text-primary">fit</span>
          </span>
        </span>
        <a
          href={MAIN_URL}
          className="inline-flex h-10 items-center gap-1 rounded-full border border-outline px-4 text-sm font-semibold text-ink-variant transition-colors hover:bg-hover hover:text-ink"
        >
          progresshub <ArrowUpRight className="size-4" aria-hidden />
        </a>
      </header>

      <section className="pt-8 pb-8 sm:pt-14">
        <h1 className="text-[2.25rem] leading-[2.75rem] font-bold tracking-[-0.03em] sm:text-5xl sm:leading-[3.5rem]">
          Weigh in. <span className="text-primary">Every day.</span>
        </h1>
        <p className="mt-3 max-w-[40ch] text-base text-ink-variant">One number each morning. The trend does the rest.</p>
      </section>

      <Suspense fallback={<div className="h-[420px] animate-pulse rounded-3xl bg-surface" aria-hidden />}>
        <Today />
      </Suspense>
    </div>
  );
}

async function Today() {
  const [{ today, logs, gymBefore }, jar] = await Promise.all([getWeights(), cookies()]);
  const saved = jar.get(UNIT_COOKIE)?.value;
  return <WeightLogger unit={isUnit(saved) ? saved : "kg"} today={today} minDay={lastDays(today, MAX_BACKFILL_DAYS + 1)[0]} logs={logs} gymBefore={gymBefore} week={lastDays(today, 7)} />;
}
