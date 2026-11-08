"use client";

import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { fmt, fmtDate, fmtSigned } from "@/lib/format";
import { addDays, daysBetween, GOAL } from "@/lib/progress";

// react-day-picker works in local time; these are plain YYYY-MM-DD calendar days.
const toLocalDate = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day);
};
const fromLocalDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

type Props = {
  /** Latest logged total and its day: the starting point of the countdown. */
  total: number;
  from: string;
  today: string;
  /** Current 7-day pace, to say whether the target is within reach. */
  pace: number;
};

/** Pick any future day; shows the daily gain needed to reach 500K by then. */
export function TargetDateCard({ total, from, today, pace }: Props) {
  const firstDay = addDays(today > from ? today : from, 1);
  const yearEnd = `${today.slice(0, 4)}-12-31`;
  const [target, setTarget] = useState(yearEnd >= firstDay ? yearEnd : `${Number(today.slice(0, 4)) + 1}-12-31`);
  const [month, setMonth] = useState(() => toLocalDate(target));

  const remaining = Math.max(0, GOAL - total);
  const days = Math.max(1, daysBetween(from, target));
  const needed = remaining / days;
  const onTrack = pace >= needed;

  return (
    <section aria-labelledby="target-title" className="panel-dark flex flex-col rounded-2xl p-5 sm:p-6">
      <h2 id="target-title" className="text-xl font-bold tracking-[-0.015em]">
        Pick your deadline
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">Choose a day to see what it takes.</p>

      <Calendar
        mode="single"
        required
        weekStartsOn={1}
        today={toLocalDate(today)}
        selected={toLocalDate(target)}
        month={month}
        onMonthChange={setMonth}
        startMonth={toLocalDate(firstDay)}
        disabled={{ before: toLocalDate(firstDay) }}
        onSelect={(d) => d && setTarget(fromLocalDate(d))}
        classNames={{ root: "mt-3 mb-4 w-full" }}
        className="-mx-2 bg-transparent"
      />

      <div className="mt-auto border-t border-hairline pt-4">
        {remaining === 0 ? (
          <p className="text-sm font-semibold">You&apos;ve already reached 500K.</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">To hit 500K by {fmtDate(target)}</p>
            <p className="mt-1.5 font-mono text-[2rem] leading-none font-semibold tracking-[-0.04em] text-primary">
              {fmtSigned(needed)}
              <span className="ml-1.5 font-sans text-sm font-medium tracking-normal text-muted-foreground">a day</span>
            </p>
            <p className="mt-2 font-mono text-xs text-subtle">
              {fmt(remaining)} to go in {days} days · {onTrack ? "you're on track" : `you're at ${fmtSigned(pace)}/day`}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
