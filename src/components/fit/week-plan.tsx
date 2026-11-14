"use client";

import { useMemo, useState } from "react";
import { nextWeekPlan } from "@/lib/fit-coach";
import type { FitLog } from "@/lib/fit-stats";
import { PLATE, muscleLabel } from "@/lib/fit-units";
import { PlateFace } from "./barbell";

const utc = (d: string) => new Date(`${d}T00:00:00Z`);
const dayNum = new Intl.DateTimeFormat("en", { day: "numeric", timeZone: "UTC" });

/**
 * Next week, day by day: each training day is a plate stack in its muscle colours with why it was
 * chosen. Pick how many days (keep pace / target / any) and the plan re-solves instantly.
 */
export function WeekPlan({ logs, today, keepPace, target }: { logs: FitLog[]; today: string; keepPace: number; target: number | null }) {
  const initial = target ?? Math.max(1, keepPace);
  const [n, setN] = useState(initial);
  const plan = useMemo(() => nextWeekPlan(logs, today, n), [logs, today, n]);
  const presets = [
    { n: keepPace, label: "Your usual" },
    ...(target !== null && target !== keepPace ? [{ n: target, label: "Your target" }] : []),
  ].filter((p) => p.n > 0);

  return (
    <section aria-label="Next week's plan" className="card-in flex flex-col gap-5 rounded-2xl border border-outline-variant bg-surface p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl font-bold uppercase">Next week</h2>
          <p className="text-sm text-ink-variant">
            {plan.sessions} days · {plan.split}
          </p>
          <p className="mt-1 max-w-[46ch] text-xs text-ink-subtle">
            Muscles you&apos;ve waited longest on come first; the same group never trains two days in a row.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {presets.map((p) => (
            <button key={p.label} type="button" aria-pressed={n === p.n} onClick={() => setN(p.n)} className={`h-11 rounded-full border px-3.5 text-xs font-bold transition-colors ${n === p.n ? "border-ink bg-primary text-primary-foreground" : "border-outline text-ink-variant hover:bg-hover"}`}>
              {p.label} · {p.n}
            </button>
          ))}
          <div className="flex items-center rounded-full border border-outline p-0.5" role="group" aria-label="Gym days next week">
            <button type="button" aria-label="Fewer days" onClick={() => setN(Math.max(1, n - 1))} className="grid size-10 place-items-center rounded-full text-ink-variant hover:bg-hover">
              −
            </button>
            <span className="w-6 text-center font-display text-lg font-bold">{n}</span>
            <button type="button" aria-label="More days" onClick={() => setN(Math.min(7, n + 1))} className="grid size-10 place-items-center rounded-full text-ink-variant hover:bg-hover">
              +
            </button>
          </div>
        </div>
      </div>

      <ol className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
        {plan.days.map((d, i) => (
          <li key={d.day} className="flex flex-col items-center gap-2">
            <span className="text-[0.6875rem] font-bold text-ink-subtle">{d.weekday.charAt(0)}<span className="hidden sm:inline">{d.weekday.slice(1)}</span></span>
            <span className="font-display text-sm font-bold text-ink-variant">{dayNum.format(utc(d.day))}</span>
            <span className="flex h-28 w-full items-end justify-center rounded-xl border border-outline-variant bg-background p-1.5 sm:h-36">
              {d.muscles.length ? (
                <span className="reveal-anim chart-grow flex h-full w-full max-w-10 flex-col gap-[3px]" style={{ animationDelay: `${i * 60}ms` }}>
                  {d.muscles.map((m) => (
                    <PlateFace key={m} muscles={[m]} className="w-full flex-1 rounded-[3px]" />
                  ))}
                </span>
              ) : (
                <span className="mb-1 text-[0.6875rem] font-bold tracking-wide text-ink-subtle uppercase">{d.rest ? "rest" : "move"}</span>
              )}
            </span>
          </li>
        ))}
      </ol>

      <ul className="flex flex-col divide-y divide-outline-variant border-t border-outline-variant">
        {plan.days
          .filter((d) => d.muscles.length || !d.rest)
          .map((d) => (
            <li key={d.day} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-3">
              <span className="w-10 font-display text-lg font-bold">{d.weekday}</span>
              <span className="flex flex-wrap gap-1.5">
                {d.muscles.length ? (
                  d.muscles.map((m) => (
                    <span key={m} className="inline-flex items-center gap-1.5 rounded-full border border-outline px-2.5 py-0.5 text-xs font-bold">
                      <span className="size-2 rounded-full" style={{ background: PLATE[m].fill }} aria-hidden />
                      {muscleLabel(m)}
                    </span>
                  ))
                ) : (
                  <span className="text-sm font-semibold text-ink-variant">Active recovery</span>
                )}
              </span>
              <span className="w-full text-xs text-ink-subtle sm:ml-auto sm:w-auto">{d.why}</span>
            </li>
          ))}
      </ul>
    </section>
  );
}
