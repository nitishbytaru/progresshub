import type { Metadata } from "next";
import { Suspense } from "react";
import { SAMPLE_TODAY, sampleEntries } from "@/lib/sample-data";
import { LogForm } from "./log-form";

export const metadata: Metadata = { title: "Daily progress" };

/** Reads `?date=` (set by the Edit links) at request time, inside Suspense so the shell can prerender. */
async function LogFormForDate({ searchParams }: { searchParams: PageProps<"/progress">["searchParams"] }) {
  const { date } = await searchParams;
  const initialDate = typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;
  return (
    <LogForm key={initialDate ?? "today"} initialEntries={sampleEntries} today={SAMPLE_TODAY} initialDate={initialDate} />
  );
}

export default function ProgressPage({ searchParams }: PageProps<"/progress">) {
  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <header>
        <h1 className="text-[1.75rem] leading-tight font-bold tracking-[-0.025em] sm:text-[2rem]">Daily progress</h1>
        <p className="mt-1 text-sm text-muted-foreground">One number a day. It takes ten seconds.</p>
      </header>
      <Suspense fallback={<LogForm initialEntries={sampleEntries} today={SAMPLE_TODAY} />}>
        <LogFormForDate searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
