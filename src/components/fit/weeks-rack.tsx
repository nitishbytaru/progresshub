"use client";

import { InView } from "@/components/progress/in-view";
import type { FitStats } from "@/lib/fit-stats";
import type { Muscle } from "@/lib/fit-units";
import { PlateFace } from "./barbell";

const utc = (d: string) => new Date(`${d}T00:00:00Z`);
const shortDate = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

/** Weeks: every gym day stacked as a plate (same scale for every week) on a steel floor rail. */
export function WeeksRack({
  s,
  highlight = null,
}: {
  s: FitStats;
  highlight?: Muscle | null;
}) {
  const maxWeek = Math.max(4, ...s.gymWeeks.map((w) => w.count));
  const matches = (muscles: Muscle[]) =>
    highlight === null || muscles.includes(highlight);
  return (
    <InView
      aria-label="Gym days per week, last 8 weeks"
      className="card-in rounded-2xl border border-outline-variant bg-surface p-4 sm:p-6"
    >
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-bold tracking-[0.14em] text-ink-variant uppercase">
          Weeks
        </h2>
        <p className="font-display text-xl font-bold">
          {s.avgPerWeek.toFixed(1)}
          <span className="text-sm text-ink-subtle"> / wk avg</span>
        </p>
      </div>
      <div
        className="mt-4 grid grid-cols-8 items-end gap-2 border-b-4 border-steel/60 pb-1"
        style={{ height: `${maxWeek * 18 + 36}px` }}
      >
        {s.gymWeeks.map((w, wi) => (
          <div
            key={w.start}
            className="flex h-full flex-col items-center justify-end gap-[3px]"
            title={`Week of ${shortDate.format(utc(w.start))}: ${w.count} gym days`}
          >
            <span className="font-display text-sm font-bold text-ink-variant">
              {w.count || ""}
            </span>
            {w.days.length === 0 && (
              <span className="h-[3px] w-full rounded-full bg-track" />
            )}
            {[...w.days].reverse().map((d, di) => (
              <span
                key={d.day}
                className="reveal-anim chart-pop w-full"
                style={{ animationDelay: `${wi * 60 + di * 40}ms` }}
              >
                <PlateFace
                  muscles={d.muscles}
                  dim={!matches(d.muscles)}
                  className="h-[15px] w-full rounded-[2px]"
                />
              </span>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-8 gap-2">
        {s.gymWeeks.map((w, wi) => (
          <span
            key={w.start}
            className={`text-center text-[0.6875rem] font-bold ${wi === s.gymWeeks.length - 1 ? "text-ink" : "text-ink-subtle"}`}
          >
            {wi === s.gymWeeks.length - 1
              ? "now"
              : shortDate.format(utc(w.start)).split(" ")[1]}
          </span>
        ))}
      </div>
      <p className="mt-4 text-sm text-ink-variant">
        {s.weekStreak > 0 ? `${s.weekStreak}-week streak` : "No streak yet"} ·{" "}
        {s.gymThisMonth} gym days this month · {s.gymTotal} all time
      </p>
    </InView>
  );
}
