import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/progress/page-skeleton";
import { getProgress } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import { LogForm } from "./log-form";

export const metadata: Metadata = { title: "Daily progress" };

/** Reads an optional `?date=` deep link and the viewer's logs at request time. */
async function LogFormForDate({ searchParams }: { searchParams: PageProps<"/progress">["searchParams"] }) {
  const [{ date }, { entries, today }] = await Promise.all([searchParams, getProgress()]);
  const initialDate = typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;
  return <LogForm key={initialDate ?? "today"} initialEntries={entries} today={today} initialDate={initialDate} />;
}

/** "24 days logged since Oct 8", beside the page heading. Refreshes with the page after every save. */
async function DaysLogged() {
  const { rows } = await getProgress();
  if (!rows.length) return null;
  return (
    <div className="panel-dark flex items-center gap-4 rounded-2xl px-5 py-3.5">
      <span className="font-mono text-[2.75rem] leading-none font-semibold tracking-[-0.04em] text-primary tabular-nums">
        {rows.length}
      </span>
      <span className="flex flex-col border-l border-hairline pl-4 leading-tight">
        <span className="text-sm font-semibold text-foreground">{rows.length === 1 ? "day" : "days"} logged</span>
        <span className="mt-0.5 font-mono text-xs text-muted-foreground">since {fmtDate(rows[0].date)}</span>
      </span>
    </div>
  );
}

export default function ProgressPage({ searchParams }: PageProps<"/progress">) {
  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h1 className="text-[1.75rem] leading-tight font-bold tracking-[-0.025em] sm:text-[2rem]">Daily progress</h1>
          <p className="mt-1 text-sm text-muted-foreground">One number a day. It takes ten seconds.</p>
        </div>
        <Suspense fallback={null}>
          <DaysLogged />
        </Suspense>
      </header>
      <Suspense fallback={<PageSkeleton blocks={["h-[520px]"]} />}>
        <LogFormForDate searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
