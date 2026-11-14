"use client";

import { useState } from "react";
import { InView } from "@/components/progress/in-view";
import type { TrendPoint } from "@/lib/fit-stats";
import { PLATE, fmtWeight, fromKg, type Muscle, type Unit } from "@/lib/fit-units";

const utc = (d: string) => new Date(`${d}T00:00:00Z`);
const shortDate = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" });
const fmtDay = (d: string) => shortDate.format(utc(d));
const daysBetween = (a: string, b: string) => Math.round((utc(b).getTime() - utc(a).getTime()) / 86_400_000);

const W = 600;
const H = 220;
const PAD = 12;

/**
 * 90-day weight: each weigh-in as a dot, the 7-day average as the chalk line, and gym days as
 * plate-coloured ticks along the floor. Drag or hover to read any day.
 */
export function TrendChart({ points, gym, unit }: { points: TrendPoint[]; gym: { day: string; muscles: Muscle[] }[]; unit: Unit }) {
  const [active, setActive] = useState<number | null>(null);
  if (points.length < 2) {
    return (
      <InView aria-label="Weight trend" className="card-in flex items-center justify-between rounded-2xl border border-outline-variant bg-surface p-4 sm:p-5 md:col-span-12" style={{ ["--card-i" as string]: 4 }}>
        <h2 className="text-xs font-bold tracking-[0.14em] text-ink-variant uppercase">Trend</h2>
        <span className="text-sm text-ink-subtle">Log two days to draw it</span>
      </InView>
    );
  }

  const vals = points.flatMap((p) => [p.kg, p.avg]).map((v) => fromKg(v, unit));
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const span = Math.max(hi - lo, 1);
  const yMin = lo - span * 0.2;
  const yMax = hi + span * 0.2;
  const first = points[0].day;
  const last = points.at(-1)!;
  const days = Math.max(1, daysBetween(first, last.day));
  const x = (d: string) => PAD + (daysBetween(first, d) / days) * (W - PAD * 2);
  const y = (kg: number) => PAD + (1 - (fromKg(kg, unit) - yMin) / (yMax - yMin)) * (H - PAD * 2 - 18);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(p.day).toFixed(1)},${y(p.avg).toFixed(1)}`).join(" ");
  const shown = points[active ?? points.length - 1];
  const gymInRange = gym.filter((g) => g.day >= first && g.day <= last.day);

  const scrub = (clientX: number, rect: DOMRect) => {
    const vx = ((clientX - rect.left) / rect.width) * W;
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(x(p.day) - vx) < Math.abs(x(points[best].day) - vx)) best = i;
    });
    setActive(best);
  };

  return (
    <InView aria-label="Weight trend, last 90 days" className="card-in rounded-2xl border border-outline-variant bg-surface p-4 sm:p-5 md:col-span-12 lg:p-6" style={{ ["--card-i" as string]: 4 }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xs font-bold tracking-[0.14em] text-ink-variant uppercase">Trend · 90 days</h2>
          <p className="mt-1 text-xs text-ink-subtle" aria-live="polite">
            {active === null ? "Drag across the chart" : fmtDay(shown.day)}
          </p>
        </div>
        <p className="text-right font-display leading-none">
          <span className="text-3xl font-bold">{fmtWeight(shown.kg, unit)}</span>
          <span className="ml-1 text-sm text-ink-subtle">{unit}</span>
          <span className="mt-1 block text-xs font-semibold text-ink-subtle">avg {fmtWeight(shown.avg, unit)}</span>
        </p>
      </div>

      <div
        className="relative mt-3 touch-pan-y select-none"
        onPointerMove={(e) => scrub(e.clientX, e.currentTarget.getBoundingClientRect())}
        onPointerDown={(e) => scrub(e.clientX, e.currentTarget.getBoundingClientRect())}
        onPointerLeave={() => setActive(null)}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-48 w-full overflow-visible sm:h-56 lg:h-64"
          role="img"
          aria-label={`7-day average went from ${fmtWeight(points[0].avg, unit)} to ${fmtWeight(last.avg, unit)} ${unit} between ${fmtDay(first)} and ${fmtDay(last.day)}`}
        >
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1={0} x2={W} y1={(H - 18) * f} y2={(H - 18) * f} stroke="var(--outline-variant)" vectorEffect="non-scaling-stroke" />
          ))}
          <line x1={0} x2={W} y1={H - 14} y2={H - 14} stroke="var(--outline)" vectorEffect="non-scaling-stroke" />
          <path
            className="reveal-anim chart-reveal"
            d={line}
            fill="none"
            stroke="var(--chalk)"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {active !== null && (
            <line x1={x(shown.day)} x2={x(shown.day)} y1={0} y2={H - 14} stroke="var(--chalk-subtle)" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
          )}
          {/* Gym days: a plate-coloured tick on the floor (first muscle trained, or steel). */}
          {gymInRange.map((g) => (
            <rect
              key={g.day}
              x={x(g.day) - 2}
              y={H - 12}
              width={4}
              height={12}
              rx={1}
              fill={g.muscles[0] ? PLATE[g.muscles[0]].fill : "var(--steel)"}
            />
          ))}
        </svg>
        {points.map((p, i) => (
          <span
            key={p.day}
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-[width,height,background-color] ${
              i === active ? "size-3 bg-ink ring-4 ring-ink/20" : "size-1.5 bg-ink-subtle"
            }`}
            style={{ left: `${(x(p.day) / W) * 100}%`, top: `${(y(p.kg) / H) * 100}%` }}
            aria-hidden
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs font-semibold text-ink-subtle">
        <span>{fmtDay(first)}</span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-1 rounded-sm bg-steel" aria-hidden /> gym day
        </span>
        <span>{fmtDay(last.day)}</span>
      </div>
    </InView>
  );
}
