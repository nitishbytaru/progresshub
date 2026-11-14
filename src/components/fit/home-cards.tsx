import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { Dumbbell } from "lucide-react";
import { InView } from "@/components/progress/in-view";
import { addDays, daysBetween, type FitStats } from "@/lib/fit-stats";
import { fmtWeight, fromKg, muscleLabel, type Unit } from "@/lib/fit-units";

const utc = (d: string) => new Date(`${d}T00:00:00Z`);
const shortDate = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" });
const fmtDay = (d: string) => shortDate.format(utc(d));
const signed = (n: number) => `${n > 0 ? "▲" : n < 0 ? "▼" : ""}${Math.abs(n).toFixed(1)}`;

/** One analysis card: staggered entrance, holds its animations until scrolled into view. */
function Card({ i, label, children, className = "" }: { i: number; label: string; children: ReactNode; className?: string }) {
  return (
    <InView
      aria-label={label}
      className={`card-in rounded-3xl border border-outline-variant bg-surface ${className}`}
      style={{ "--card-i": i } as CSSProperties}
    >
      {children}
    </InView>
  );
}

/** Label on the left, big mono number on the right (the ConsistencyCard pattern). */
function Stat({ label, value, unit, accent = false, tag }: { label: string; value: string; unit?: string; accent?: boolean; tag?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-sm font-semibold text-ink-variant">{label}</span>
      <span className="flex items-baseline gap-2">
        {tag && <span className="font-mono text-xs text-ink-subtle">{tag}</span>}
        <span className={`font-mono text-2xl font-semibold tracking-[-0.03em] ${accent ? "text-primary" : "text-ink"}`}>
          {value}
          {unit && <span className="ml-1 text-base text-ink-subtle">{unit}</span>}
        </span>
      </span>
    </div>
  );
}

export function EmptyHome() {
  return (
    <Card i={0} label="Get started" className="flex flex-col items-center gap-4 p-8 text-center">
      <span className="font-mono text-xs tracking-[0.04em] text-ink-subtle uppercase">No logs yet</span>
      <p className="max-w-[28ch] text-lg font-semibold">Log your first weigh-in to unlock your trends.</p>
      <Link
        href="/log"
        className="inline-flex h-12 items-center rounded-full bg-primary px-6 text-base font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
      >
        Log weight
      </Link>
    </Card>
  );
}

/** Now: current weight, 30-day change, 7-day average, low and high. */
export function WeightCard({ s, unit }: { s: FitStats; unit: Unit }) {
  const latest = s.latest!;
  const change = s.change30 === null ? null : fromKg(s.change30, unit);
  return (
    <Card i={0} label="Current weight" className="divide-y divide-outline-variant">
      <div className="flex items-end justify-between gap-4 p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-ink-variant">Now</span>
          <span className="font-mono text-xs text-ink-subtle">{fmtDay(latest.day)}</span>
        </div>
        <span className="font-mono text-5xl font-semibold tracking-[-0.05em] text-primary sm:text-6xl">
          {fmtWeight(latest.kg, unit)}
          <span className="ml-1.5 text-xl tracking-normal text-ink-subtle">{unit}</span>
        </span>
      </div>
      <div className="p-5 sm:p-6">
        <span
          aria-label={change === null ? "Not enough history for a 30-day change" : `${change.toFixed(1)} ${unit} since ${s.change30From}`}
        >
          <Stat label="30 days" value={change === null ? "—" : signed(change)} unit={change === null ? undefined : unit} tag={s.change30From ? `since ${fmtDay(s.change30From)}` : undefined} />
        </span>
      </div>
      <dl className="grid grid-cols-3 divide-x divide-outline-variant">
        {[
          { label: "7d avg", value: s.avg7 },
          { label: "Low", value: s.low?.kg ?? null },
          { label: "High", value: s.high?.kg ?? null },
        ].map((m) => (
          <div key={m.label} className="flex flex-col gap-1 px-4 py-4 sm:px-6">
            <dt className="font-mono text-xs text-ink-subtle">{m.label}</dt>
            <dd className="font-mono text-lg font-semibold tracking-[-0.02em]">{m.value === null ? "—" : fmtWeight(m.value, unit)}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

/** 90-day trend: each weigh-in as a dot, the 7-day average as the line. */
export function TrendCard({ s, unit }: { s: FitStats; unit: Unit }) {
  const pts = s.trend;
  if (pts.length < 2) {
    return (
      <Card i={1} label="Weight trend" className="flex items-center justify-between gap-4 p-5 sm:p-6">
        <span className="text-sm font-semibold text-ink-variant">Trend</span>
        <span className="font-mono text-xs text-ink-subtle">log 2+ days to see it</span>
      </Card>
    );
  }
  const W = 600;
  const H = 200;
  const PAD = 10;
  const vals = pts.flatMap((p) => [p.kg, p.avg]).map((v) => fromKg(v, unit));
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const span = Math.max(hi - lo, 1);
  const yMin = lo - span * 0.15;
  const yMax = hi + span * 0.15;
  const first = pts[0].day;
  const days = Math.max(1, daysBetween(first, pts.at(-1)!.day));
  const x = (d: string) => PAD + (daysBetween(first, d) / days) * (W - PAD * 2);
  const y = (kg: number) => PAD + (1 - (fromKg(kg, unit) - yMin) / (yMax - yMin)) * (H - PAD * 2);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(p.day).toFixed(1)},${y(p.avg).toFixed(1)}`).join(" ");
  const area = `${line} L${x(pts.at(-1)!.day).toFixed(1)},${H} L${x(first).toFixed(1)},${H} Z`;
  const last = pts.at(-1)!;

  return (
    <Card i={1} label="Weight trend, last 90 days" className="flex flex-col gap-4 p-5 sm:p-6">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold text-ink-variant">Trend</span>
        <span className="flex items-center gap-3 font-mono text-xs text-ink-subtle">
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-ink-subtle" aria-hidden /> day
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-3 rounded-full bg-primary" aria-hidden /> 7d avg
          </span>
        </span>
      </div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-44 w-full overflow-visible sm:h-52"
          preserveAspectRatio="none"
          role="img"
          aria-label={`7-day average went from ${fmtWeight(pts[0].avg, unit)} to ${fmtWeight(last.avg, unit)} ${unit} between ${fmtDay(first)} and ${fmtDay(last.day)}`}
        >
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1={0} x2={W} y1={H * f} y2={H * f} stroke="var(--outline-variant)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}
          <g className="reveal-anim chart-reveal">
            <path d={area} fill="var(--ice-soft)" />
            <path d={line} fill="none" stroke="var(--ice)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </g>
        </svg>
        {/* Dots as HTML so they stay round while the SVG stretches. */}
        {pts.map((p, i) => (
          <span
            key={p.day}
            title={`${fmtDay(p.day)}: ${fmtWeight(p.kg, unit)} ${unit}`}
            className="reveal-anim chart-pop absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink-subtle"
            style={{ left: `${(x(p.day) / W) * 100}%`, top: `${(y(p.kg) / H) * 100}%`, animationDelay: `${Math.round((i / pts.length) * 1100)}ms` }}
            aria-hidden
          />
        ))}
        <span
          className="reveal-anim chart-pop absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-primary"
          style={{ left: `${(x(last.day) / W) * 100}%`, top: `${(y(last.avg) / H) * 100}%`, animationDelay: "1200ms" }}
          aria-hidden
        />
      </div>
      <div className="flex justify-between font-mono text-xs text-ink-subtle">
        <span>{fmtDay(first)}</span>
        <span>
          {fmtWeight(s.low!.kg, unit)}–{fmtWeight(s.high!.kg, unit)} {unit}
        </span>
        <span>{fmtDay(last.day)}</span>
      </div>
    </Card>
  );
}

/** Gym: this week's days, weekly bars, streak and totals. */
export function GymCard({ s, today }: { s: FitStats; today: string }) {
  const maxWeek = Math.max(1, ...s.gymWeeks.map((w) => w.count));
  return (
    <Card i={2} label="Gym" className="divide-y divide-outline-variant">
      <div className="flex flex-col gap-3 p-5 sm:p-6">
        <Stat label="This week" value={`${s.gymWeekCount}`} unit="/7" accent />
        <ol className="grid grid-cols-7 gap-2" aria-label={`${s.gymWeekCount} gym days this week`}>
          {s.gymWeek.map((d) => (
            <li key={d.day} className="flex flex-col items-center gap-1.5" title={`${fmtDay(d.day)}${d.gym ? ": gym" : ""}`}>
              <span
                className={`relative grid aspect-square w-full place-items-center rounded-lg ${
                  d.gym === null ? "border border-dashed border-outline" : d.gym ? "bg-primary" : "bg-track"
                } ${d.day === today ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : ""}`}
              >
                {d.gym && <Dumbbell className="size-3.5 text-primary-foreground" aria-hidden />}
              </span>
              <span className="font-mono text-[0.6875rem] text-ink-subtle">{"MTWTFSS"[s.gymWeek.indexOf(d)]}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="flex flex-col gap-3 p-5 sm:p-6">
        <Stat label="Per week" value={s.avgPerWeek.toFixed(1)} tag="4-wk avg" />
        <div className="flex h-16 items-end gap-2" role="img" aria-label={`Gym days per week, last 8 weeks: ${s.gymWeeks.map((w) => w.count).join(", ")}`}>
          {s.gymWeeks.map((w, i) => (
            <div key={w.start} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`Week of ${fmtDay(w.start)}: ${w.count}`}>
              <span className="font-mono text-[0.625rem] text-ink-subtle">{w.count || ""}</span>
              <span
                className={`reveal-anim chart-grow w-full rounded-md ${i === s.gymWeeks.length - 1 ? "bg-primary" : "bg-ink-subtle"}`}
                style={{ height: `${Math.max(4, (w.count / maxWeek) * 70)}%`, animationDelay: `${i * 70}ms`, opacity: w.count ? 1 : 0.3 }}
              />
            </div>
          ))}
        </div>
      </div>
      <dl className="grid grid-cols-3 divide-x divide-outline-variant">
        {[
          { label: "Streak", value: `${s.weekStreak}`, tag: "wk" },
          { label: "Month", value: `${s.gymThisMonth}`, tag: "days" },
          { label: "Total", value: `${s.gymTotal}`, tag: "days" },
        ].map((m) => (
          <div key={m.label} className="flex flex-col gap-1 px-4 py-4 sm:px-6">
            <dt className="font-mono text-xs text-ink-subtle">{m.label}</dt>
            <dd className="font-mono text-lg font-semibold tracking-[-0.02em]">
              {m.value}
              <span className="ml-1 text-xs text-ink-subtle">{m.tag}</span>
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

/** Muscles: sessions per group in the last 30 days and how long since each was trained. */
export function MusclesCard({ s }: { s: FitStats }) {
  const max = Math.max(1, ...s.muscles.map((m) => m.count30));
  const trained = s.muscles.filter((m) => m.lastDay);
  // The group that's waited longest (never trained counts as longest) is "due", once any are tagged.
  const due = trained.length
    ? [...s.muscles].sort((a, b) => (b.daysAgo ?? Infinity) - (a.daysAgo ?? Infinity))[0].muscle
    : null;
  return (
    <Card i={3} label="Muscle groups, last 30 days" className="flex flex-col gap-1 p-5 sm:p-6">
      <div className="flex items-baseline justify-between pb-3">
        <span className="text-sm font-semibold text-ink-variant">Muscles</span>
        <span className="font-mono text-xs text-ink-subtle">30d sessions · last</span>
      </div>
      {!trained.length ? (
        <p className="font-mono text-xs text-ink-subtle">tag muscles on a gym day to see the split</p>
      ) : (
        <ul className="flex flex-col divide-y divide-outline-variant">
          {s.muscles.map((m, i) => (
            <li
              key={m.muscle}
              className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-3 py-2.5"
              aria-label={`${muscleLabel(m.muscle)}: ${m.count30} sessions in 30 days, ${m.daysAgo === null ? "never trained" : `last ${m.daysAgo} days ago`}`}
            >
              <span className="text-sm font-semibold">{muscleLabel(m.muscle)}</span>
              <span className="flex items-center gap-2">
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-track">
                  <span
                    className="reveal-anim chart-reveal block h-full rounded-full bg-primary"
                    style={{ width: `${(m.count30 / max) * 100}%`, animationDelay: `${i * 80}ms` }}
                  />
                </span>
                <span className="w-5 text-right font-mono text-sm font-semibold">{m.count30}</span>
              </span>
              <span
                className={`min-w-14 rounded-full px-2 py-0.5 text-center font-mono text-xs ${
                  m.muscle === due ? "bg-primary-soft text-primary" : "text-ink-subtle"
                }`}
              >
                {m.daysAgo === null ? "never" : m.daysAgo === 0 ? "today" : `${m.daysAgo}d`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Logging consistency: the last 30 days as squares. */
export function LoggedCard({ s, today, loggedDays }: { s: FitStats; today: string; loggedDays: Set<string> }) {
  const days = Array.from({ length: 30 }, (_, i) => addDays(today, i - 29));
  return (
    <Card i={4} label="Logging, last 30 days" className="flex flex-col gap-3 p-5 sm:p-6">
      <Stat label="Logged" value={`${s.logged30}`} unit="/30" accent />
      <ol className="grid grid-cols-10 gap-1.5" aria-label={`Logged ${s.logged30} of the last 30 days`}>
        {days.map((d, i) => (
          <li
            key={d}
            title={`${fmtDay(d)}${loggedDays.has(d) ? ": logged" : ""}`}
            className={`reveal-anim chart-pop aspect-square rounded-md ${loggedDays.has(d) ? "bg-primary" : "bg-track"} ${
              d === today ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : ""
            }`}
            style={{ animationDelay: `${i * 18}ms` }}
          />
        ))}
      </ol>
    </Card>
  );
}
