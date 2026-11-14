"use client";

import { useEffect, useRef, useState } from "react";
import type { MuscleRow } from "@/lib/fit-insights";
import { PLATE, muscleLabel } from "@/lib/fit-units";

const utc = (d: string) => new Date(`${d}T00:00:00Z`);
const short = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" });
const WD = ["M", "T", "W", "T", "F", "S", "S"];

/**
 * Sessions per muscle group per week (8 weeks): each cell stacks one plate per session. Tap a group
 * for its drill-down: weekly average, last trained, longest gap and which weekdays you train it.
 */
export function MuscleMatrix({ weeks, rows }: { weeks: string[]; rows: MuscleRow[] }) {
  const [sel, setSel] = useState(() => [...rows].sort((a, b) => b.total - a.total)[0]?.muscle ?? rows[0].muscle);
  const row = rows.find((r) => r.muscle === sel)!;
  const maxWd = Math.max(1, ...row.byWeekday);
  // Phones can't fit 8 weeks: start scrolled to the newest week (and the avg column).
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  return (
    <section aria-label="Muscle groups by week" className="card-in flex min-w-0 flex-col gap-5 rounded-2xl border border-outline-variant bg-surface p-4 sm:p-6">
      <div className="flex items-end justify-between gap-3">
        <h2 className="font-display text-3xl font-bold uppercase">Muscles × weeks</h2>
        <span className="text-xs text-ink-subtle">tap a group</span>
      </div>
      <div ref={scroller} className="overflow-x-auto">
        <table className="w-full min-w-[440px] border-separate border-spacing-y-1.5">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 w-24 bg-surface text-left text-[0.6875rem] font-bold text-ink-subtle" scope="col">
                <span className="sr-only">Muscle group</span>
              </th>
              {weeks.map((w, i) => (
                <th key={w} scope="col" className={`text-[0.6875rem] font-bold ${i === weeks.length - 1 ? "text-ink" : "text-ink-subtle"}`}>
                  {i === weeks.length - 1 ? "now" : short.format(utc(w)).split(" ")[1]}
                </th>
              ))}
              <th scope="col" className="w-12 text-right text-[0.6875rem] font-bold text-ink-subtle">avg</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const on = r.muscle === sel;
              return (
                <tr key={r.muscle} className={`transition-opacity ${on ? "" : "opacity-70 hover:opacity-100"}`}>
                  <th scope="row" className="sticky left-0 z-10 bg-surface pr-1 text-left">
                    <button type="button" aria-pressed={on} onClick={() => setSel(r.muscle)} className={`flex min-h-11 items-center gap-2 rounded-full pr-2 text-sm font-semibold ${on ? "text-ink" : "text-ink-variant"}`}>
                      <span className={`size-3 rounded-full ${on ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : ""}`} style={{ background: PLATE[r.muscle].fill }} aria-hidden />
                      {muscleLabel(r.muscle)}
                    </button>
                  </th>
                  {r.perWeek.map((n, i) => (
                    <td key={i} className="px-0.5" title={`${muscleLabel(r.muscle)}, week of ${short.format(utc(weeks[i]))}: ${n}`}>
                      <span className="flex h-11 flex-col-reverse gap-[2px] rounded-md bg-background p-[3px]">
                        {Array.from({ length: Math.min(n, 4) }, (_, k) => (
                          <span key={k} className="h-[6px] rounded-[2px]" style={{ background: PLATE[r.muscle].fill }} />
                        ))}
                      </span>
                    </td>
                  ))}
                  <td className="text-right font-display text-lg font-bold">{r.avgPerWeek}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Drill-down for the selected group. */}
      <div className="grid gap-4 border-t border-outline-variant pt-4 sm:grid-cols-[1fr_auto]" aria-live="polite">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          {[
            { l: "Per week", v: `${row.avgPerWeek}`, u: "sessions" },
            { l: "Last trained", v: row.daysSince === null ? "never" : row.daysSince === 0 ? "today" : `${row.daysSince}`, u: row.daysSince ? "d ago" : "" },
            { l: "Longest gap", v: row.longestGap === null ? "—" : `${row.longestGap}`, u: row.longestGap ? "days" : "" },
            { l: "8 weeks", v: `${row.total}`, u: "sessions" },
          ].map((s) => (
            <div key={s.l}>
              <dt className="text-xs text-ink-subtle">{s.l}</dt>
              <dd className="font-display text-2xl font-bold">
                {s.v}
                <span className="ml-1 text-sm text-ink-subtle">{s.u}</span>
              </dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-ink-subtle">{row.favourite ? `Usually on ${row.favourite}` : "No sessions yet"}</span>
          <div className="flex h-12 items-end gap-1" role="img" aria-label={`${muscleLabel(row.muscle)} sessions by weekday: ${row.byWeekday.join(", ")}`}>
            {row.byWeekday.map((n, i) => (
              <div key={i} className="flex w-5 flex-col items-center gap-1">
                <span className="w-full rounded-sm" style={{ height: `${Math.max(3, (n / maxWd) * 32)}px`, background: n ? PLATE[row.muscle].fill : "var(--track)" }} />
                <span className="text-[0.6875rem] font-bold text-ink-subtle">{WD[i]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
