"use client";

import { useState } from "react";
import { Dumbbell, Pencil } from "lucide-react";
import type { FitLog } from "@/lib/fit-stats";
import { fmtWeight, fromKg, type Unit } from "@/lib/fit-units";
import { Barbell, PlateFace } from "./barbell";
import { editDayInFlow } from "./log-flow";

const utc = (d: string) => new Date(`${d}T00:00:00Z`);
const shortDate = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", timeZone: "UTC" });
const weekday = new Intl.DateTimeFormat("en", { weekday: "short", timeZone: "UTC" });

/**
 * Beside the inline log flow: this week's loaded bar, the week as day squares and the last seven
 * weigh-ins. Tapping a day loads it into the flow to log or edit.
 */
export function LogHistory({ logs, today, week, unit }: { logs: FitLog[]; today: string; week: string[]; unit: Unit }) {
  const [picked, setPicked] = useState<string | null>(null);
  const byDay = new Map(logs.map((l) => [l.day, l]));
  const logged = week.filter((d) => byDay.has(d)).length;
  const barDays = week.filter((d) => d <= today).flatMap((d) => {
    const l = byDay.get(d);
    return l?.gym ? [{ day: d, muscles: l.muscles, kg: l.kg }] : [];
  });
  const pick = (d: string) => {
    setPicked(d);
    editDayInFlow(d);
  };

  return (
    <section aria-label="Your last 7 days" className="card-in divide-y divide-outline-variant rounded-2xl border border-outline-variant bg-surface md:sticky md:top-6" style={{ ["--card-i" as string]: 1 }}>
      <div className="flex flex-col gap-3 p-5 sm:p-6">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold text-ink-variant">This week</span>
          <span className="font-display text-2xl font-bold">
            {logged}
            <span className="text-ink-subtle"> / 7 logged</span>
          </span>
        </div>
        <div className="px-1" role="img" aria-label={`This week: ${barDays.length} gym days loaded`}>
          <Barbell days={barDays} unit={unit} size="sm" />
        </div>
        <ol className="grid grid-cols-7 gap-2">
          {week.map((d, i) => {
            const l = byDay.get(d);
            return (
              <li key={d}>
                <button
                  type="button"
                  onClick={() => pick(d)}
                  disabled={d > today}
                  aria-pressed={d === picked}
                  aria-label={`${weekday.format(utc(d))} ${shortDate.format(utc(d))}: ${l ? `${fmtWeight(l.kg, unit)} ${unit}${l.gym ? ", gym" : ""}, tap to edit` : "no entry, tap to log"}`}
                  className="flex w-full flex-col items-center gap-1.5 disabled:cursor-default"
                >
                  <span
                    className={`relative aspect-square w-full rounded-lg transition-shadow ${
                      d > today ? "border border-dashed border-outline" : l ? "bg-primary" : "bg-track hover:bg-hover"
                    } ${d === picked ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : ""}`}
                  >
                    {l?.gym && <Dumbbell className="absolute inset-0 m-auto size-3.5 text-primary-foreground" aria-hidden />}
                  </span>
                  <span className={`text-[0.6875rem] font-bold ${d === today ? "text-ink" : "text-ink-subtle"}`}>{"MTWTFSS"[i]}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {logs.length > 0 && (
        <div className="flex flex-col gap-1 p-3 sm:p-4">
          <span className="px-2 pt-1 pb-2 text-sm font-semibold text-ink-variant">Recent</span>
          <ul className="flex flex-col">
            {logs.slice(0, 7).map((l, i) => {
              const prev = logs[i + 1];
              const diff = prev ? Math.round((fromKg(l.kg, unit) - fromKg(prev.kg, unit)) * 10) / 10 : null;
              return (
                <li key={l.day}>
                  <button
                    type="button"
                    onClick={() => pick(l.day)}
                    aria-label={`Edit ${shortDate.format(utc(l.day))}: ${fmtWeight(l.kg, unit)} ${unit}`}
                    className={`group flex h-12 w-full items-center justify-between rounded-xl px-2 transition-colors hover:bg-hover ${l.day === picked ? "bg-hover" : ""}`}
                  >
                    <span className="text-sm font-semibold text-ink-variant">{l.day === today ? "Today" : shortDate.format(utc(l.day))}</span>
                    <span className="flex items-center gap-3">
                      {diff !== null && diff !== 0 && (
                        <span className="font-display text-sm text-ink-subtle">
                          {diff > 0 ? "▲" : "▼"}
                          {Math.abs(diff).toFixed(1)}
                        </span>
                      )}
                      {l.gym && <PlateFace muscles={l.muscles} className="h-5 w-1.5" />}
                      <span className="font-display text-xl font-bold text-ink">{fmtWeight(l.kg, unit)}</span>
                      <Pencil className="size-3.5 text-ink-subtle transition-colors group-hover:text-ink" aria-hidden />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
