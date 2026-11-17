"use client";

import {
  useMemo,
  useRef,
  useId,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { AnimatePresence, MotionConfig, motion, useInView } from "motion/react";
import {
  addDays,
  daysBetween,
  type TrendPoint,
} from "@/lib/fit-stats";
import {
  PLATE,
  fmtWeight,
  fromKg,
  muscleLabel,
  type Muscle,
  type Unit,
} from "@/lib/fit-units";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const utc = (d: string) => new Date(`${d}T00:00:00Z`);
const fmtDay = (d: string) =>
  `${MONTHS[utc(d).getUTCMonth()]} ${utc(d).getUTCDate()}`;
const fmtLong = (d: string) => `${WEEKDAYS[utc(d).getUTCDay()]}, ${fmtDay(d)}`;

const RANGES = [30, 60, 90] as const;
type Range = (typeof RANGES)[number];

/** SVG plot box (stretched to the container; strokes don't scale). */
const W = 600;
const PLOT_H = 220;
const FLOOR = 18;
const H = PLOT_H + FLOOR;
const ease = [0.2, 0.9, 0.25, 1] as const;

/** A signed delta in the viewer's unit, direction as ▲/▼ (never coloured). */
const signed = (kg: number, unit: Unit, digits = 1) => {
  const v = fromKg(kg, unit);
  if (Math.abs(v) < 0.05) return "±0.0";
  return `${v > 0 ? "▲" : "▼"} ${Math.abs(v).toFixed(digits)}`;
};

/** Round tick step so the axis shows about four lines. */
function niceStep(span: number) {
  const raw = span / 4;
  return [0.2, 0.5, 1, 2, 5, 10, 20].find((s) => s >= raw) ?? 50;
}

/**
 * Weight trend: weigh-ins as dots, the 7-day average as the chalk line with a faint fill, a dashed
 * goal line when the profile has a target, low/high flags, gym days as stacked plate-colour ticks on
 * the floor, and a weekly-change strip underneath. Switch 30/60/90 days; drag, hover or use the
 * arrow keys to read any day.
 */
export function TrendChart({
  points,
  gym,
  unit,
  target = null,
}: {
  points: TrendPoint[];
  gym: { day: string; muscles: Muscle[] }[];
  unit: Unit;
  target?: number | null;
}) {
  const [range, setRange] = useState<Range>(90);
  const [active, setActive] = useState<number | null>(null);
  const clipId = useId();
  const card = useRef<HTMLElement>(null);
  const inView = useInView(card, { once: true, margin: "0px 0px -20% 0px" });

  const lastDay = points.at(-1)?.day ?? "";
  const pts = useMemo(() => {
    const from = addDays(lastDay, -(range - 1));
    const inRange = points.filter((p) => p.day >= from);
    return inRange.length >= 2 ? inRange : points;
  }, [points, range, lastDay]);

  if (points.length < 2) {
    return (
      <section
        aria-label="Weight trend"
        className="card-in flex items-center justify-between rounded-2xl border border-outline-variant bg-surface p-4 sm:p-5 md:col-span-12"
        style={{ "--card-i": 0 } as CSSProperties}
      >
        <h2 className="text-xs font-bold tracking-[0.14em] text-ink-variant uppercase">
          Trend
        </h2>
        <span className="text-sm text-ink-subtle">Log two days to draw it</span>
      </section>
    );
  }

  const first = pts[0];
  const last = pts.at(-1)!;
  const spanDays = Math.max(1, daysBetween(first.day, last.day));

  // Stats for the visible range (the change uses the 7-day average so one salty day doesn't skew it).
  const change = last.avg - first.avg;
  const perWeek = (change / spanDays) * 7;
  const low = pts.reduce((m, p) => (p.kg < m.kg ? p : m));
  const high = pts.reduce((m, p) => (p.kg > m.kg ? p : m));

  // Y domain in the viewer's unit; the goal joins it only when it's close enough not to squash the line.
  const vals = pts.flatMap((p) => [p.kg, p.avg]).map((v) => fromKg(v, unit));
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  const dataSpan = Math.max(hi - lo, 1);
  const goal = target === null ? null : fromKg(target, unit);
  const goalInView =
    goal !== null && goal > lo - dataSpan * 0.6 && goal < hi + dataSpan * 0.6;
  if (goalInView) {
    lo = Math.min(lo, goal);
    hi = Math.max(hi, goal);
  }
  const pad = Math.max(hi - lo, 1) * 0.14;
  const yMin = lo - pad;
  const yMax = hi + pad;
  const step = niceStep(yMax - yMin);
  const ticks: number[] = [];
  for (let t = Math.ceil(yMin / step) * step; t <= yMax; t += step)
    ticks.push(Math.round(t * 10) / 10);

  const x = (d: string) => (daysBetween(first.day, d) / spanDays) * W;
  const yU = (v: number) =>
    6 + (1 - (v - yMin) / (yMax - yMin)) * (PLOT_H - 12);
  const y = (kg: number) => yU(fromKg(kg, unit));
  const pct = (vx: number, vy: number) => ({
    left: `${(vx / W) * 100}%`,
    top: `${(vy / H) * 100}%`,
  });

  const line = pts
    .map(
      (p, i) => `${i ? "L" : "M"}${x(p.day).toFixed(1)},${y(p.avg).toFixed(1)}`,
    )
    .join(" ");
  const area = `${line} L${x(last.day).toFixed(1)},${PLOT_H} L0,${PLOT_H} Z`;

  const gymByDay = new Map(gym.map((g) => [g.day, g.muscles]));
  const gymInRange = gym.filter((g) => g.day >= first.day && g.day <= last.day);

  // Month starts inside the range, for the x-axis.
  const months: string[] = [];
  for (let d = addDays(first.day, 1); d <= last.day; d = addDays(d, 1))
    if (utc(d).getUTCDate() === 1) months.push(d);

  // Weekly change of the 7-day average: last average of each week vs the week before.

  const shown = active === null ? null : pts[active];
  const prev = active ? pts[active - 1] : null;

  const scrub = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const vx = ((e.clientX - r.left) / r.width) * W;
    let best = 0;
    pts.forEach((p, i) => {
      if (Math.abs(x(p.day) - vx) < Math.abs(x(pts[best].day) - vx)) best = i;
    });
    setActive(best);
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (
      e.key !== "ArrowLeft" &&
      e.key !== "ArrowRight" &&
      e.key !== "Home" &&
      e.key !== "End"
    )
      return;
    e.preventDefault();
    const cur = active ?? pts.length - 1;
    const next =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? pts.length - 1
          : cur + (e.key === "ArrowLeft" ? -1 : 1);
    setActive(Math.max(0, Math.min(pts.length - 1, next)));
  };

  const stats = [
    {
      l: "Change",
      v: signed(change, unit),
      u: unit,
      d: `${fmtDay(first.day)} → ${fmtDay(last.day)}`,
    },
    {
      l: "Per week",
      v: signed(perWeek, unit, 2),
      u: `${unit}/wk`,
      d: "7-day avg",
    },
    { l: "Low", v: fmtWeight(low.kg, unit), u: unit, d: fmtDay(low.day) },
    { l: "High", v: fmtWeight(high.kg, unit), u: unit, d: fmtDay(high.day) },
  ];

  return (
    <MotionConfig reducedMotion="user">
      <section
        ref={card}
        aria-label={`Weight trend, last ${range} days`}
        className="card-in flex flex-col gap-5 rounded-2xl border border-outline-variant bg-surface p-4 sm:p-5 md:col-span-12 lg:p-6"
        style={{ "--card-i": 0 } as CSSProperties}
      >
        {/* Title, range switch and today's weight. */}
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
          <div className="flex flex-col gap-2">
            <h2 className="font-display text-3xl leading-none font-bold uppercase">
              Weight trend
            </h2>
            <div
              role="radiogroup"
              aria-label="Range"
              className="flex w-fit gap-1 rounded-full border border-outline p-1"
            >
              {RANGES.map((r) => (
                <button
                  key={r}
                  type="button"
                  role="radio"
                  aria-checked={range === r}
                  onClick={() => {
                    setRange(r);
                    setActive(null);
                  }}
                  className={`relative h-7 rounded-full px-3 text-xs font-bold transition-colors ${range === r ? "text-primary-foreground" : "text-ink-variant hover:text-ink"}`}
                >
                  {range === r && (
                    <motion.span
                      layoutId="trend-range"
                      className="absolute inset-0 rounded-full bg-primary"
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 36,
                      }}
                    />
                  )}
                  <span className="relative">{r}D</span>
                </button>
              ))}
            </div>
          </div>
          <p className="text-right font-display leading-none">
            <span className="text-5xl font-bold tabular-nums">
              {fmtWeight(last.kg, unit)}
            </span>
            <span className="ml-1 text-lg text-ink-subtle">{unit}</span>
            <span className="mt-1 block text-xs font-semibold text-ink-subtle">
              {fmtDay(last.day)} · avg {fmtWeight(last.avg, unit)}
              {goal !== null &&
                ` · ${Math.abs(fromKg(last.avg, unit) - goal).toFixed(1)} to goal`}
            </span>
          </p>
        </div>

        {/* Range stats. */}
        <dl className="grid grid-cols-2 border-y border-outline-variant sm:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div
              key={`${s.l}-${range}`}
              className={`flex flex-col gap-0.5 px-3 py-3 ${i % 2 ? "border-l border-outline-variant" : ""} ${i > 1 ? "border-t border-outline-variant sm:border-t-0" : ""} ${i === 2 ? "sm:border-l" : ""}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.35, ease }}
            >
              <dt className="text-[0.6875rem] font-bold tracking-[0.12em] text-ink-subtle uppercase">
                {s.l}
              </dt>
              <dd className="font-display text-2xl leading-tight font-bold tabular-nums">
                {s.v}
                <span className="ml-1 text-xs text-ink-subtle">{s.u}</span>
              </dd>
              <dd className="text-[0.6875rem] text-ink-subtle">{s.d}</dd>
            </motion.div>
          ))}
        </dl>

        {/* Chart: y-axis gutter + plot. */}
        <div className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-2">
          <div className="relative h-56 sm:h-64 lg:h-72" aria-hidden>
            {ticks.map((t) => (
              <span
                key={t}
                className="absolute right-0 -translate-y-1/2 font-display text-xs font-bold text-ink-subtle tabular-nums"
                style={{ top: `${(yU(t) / H) * 100}%` }}
              >
                {t % 1 ? t.toFixed(1) : t}
              </span>
            ))}
          </div>

          <div
            className="relative h-56 touch-pan-y outline-none select-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-ring sm:h-64 lg:h-72"
            tabIndex={0}
            role="img"
            aria-label={`7-day average went from ${fmtWeight(first.avg, unit)} to ${fmtWeight(last.avg, unit)} ${unit} between ${fmtDay(first.day)} and ${fmtDay(last.day)}. Low ${fmtWeight(low.kg, unit)} on ${fmtDay(low.day)}, high ${fmtWeight(high.kg, unit)} on ${fmtDay(high.day)}. Use arrow keys to read days.`}
            onPointerMove={scrub}
            onPointerDown={scrub}
            onPointerLeave={() => setActive(null)}
            onKeyDown={onKey}
            onBlur={() => setActive(null)}
          >
            <svg
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full overflow-visible"
            >
              {ticks.map((t) => (
                <line
                  key={t}
                  x1={0}
                  x2={W}
                  y1={yU(t)}
                  y2={yU(t)}
                  stroke="var(--outline-variant)"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {months.map((d) => (
                <line
                  key={d}
                  x1={x(d)}
                  x2={x(d)}
                  y1={0}
                  y2={PLOT_H}
                  stroke="var(--outline-variant)"
                  strokeDasharray="2 4"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {goalInView && goal !== null && (
                <line
                  x1={0}
                  x2={W}
                  y1={yU(goal)}
                  y2={yU(goal)}
                  stroke="var(--chalk-variant)"
                  strokeDasharray="6 5"
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                />
              )}
              <line
                x1={0}
                x2={W}
                y1={PLOT_H + 1}
                y2={PLOT_H + 1}
                stroke="var(--steel)"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />

              {/* The line and its fill wipe in left to right (a clip, so it works on a stretched plot). */}
              <defs>
                <clipPath id={clipId}>
                  <motion.rect
                    key={range}
                    x={-4}
                    y={-8}
                    height={H + 16}
                    initial={{ width: 0 }}
                    animate={{ width: inView ? W + 8 : 0 }}
                    transition={{ duration: 1.2, ease: [0.45, 0, 0.15, 1] }}
                  />
                </clipPath>
              </defs>
              <g key={range}>
                <g clipPath={`url(#${clipId})`}>
                  <motion.path d={area} fill="var(--chalk)" opacity={0.06} />
                  <motion.path
                    d={line}
                    fill="none"
                    stroke="var(--chalk)"
                    strokeWidth={2.5}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
                {/* Gym days on the floor: one stacked segment per muscle trained (steel if untagged). */}
                {gymInRange.map((g, i) => {
                  const segs = g.muscles.length
                    ? g.muscles.slice(0, 3)
                    : [null];
                  const h = (FLOOR - 4) / segs.length;
                  return segs.map((m, k) => (
                    <motion.rect
                      key={`${g.day}-${k}`}
                      x={x(g.day) - 2.5}
                      width={5}
                      y={PLOT_H + 4 + k * h}
                      height={h - 1}
                      rx={1}
                      fill={m ? PLATE[m].fill : "var(--steel)"}
                      initial={{ opacity: 0 }}
                      animate={{
                        opacity: inView
                          ? shown && shown.day !== g.day
                            ? 0.45
                            : 1
                          : 0,
                      }}
                      transition={{
                        delay: inView && !shown ? 0.3 + i * 0.012 : 0,
                        duration: 0.25,
                      }}
                    />
                  ));
                })}
              </g>

              {shown && (
                <>
                  <line
                    x1={x(shown.day)}
                    x2={x(shown.day)}
                    y1={0}
                    y2={PLOT_H}
                    stroke="var(--chalk-subtle)"
                    strokeDasharray="3 4"
                    vectorEffect="non-scaling-stroke"
                  />
                  <line
                    x1={0}
                    x2={W}
                    y1={y(shown.kg)}
                    y2={y(shown.kg)}
                    stroke="var(--outline)"
                    strokeDasharray="3 4"
                    vectorEffect="non-scaling-stroke"
                  />
                </>
              )}
            </svg>

            {/* Weigh-in dots (HTML so they stay round on a stretched plot). */}
            {pts.map((p, i) => (
              <motion.span
                key={`${range}-${p.day}`}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-[width,height,background-color] ${
                  i === active
                    ? "z-10 size-3 bg-ink ring-4 ring-ink/20"
                    : "size-1.5 bg-ink-subtle"
                }`}
                style={pct(x(p.day), y(p.kg))}
                initial={{ opacity: 0, scale: 0 }}
                animate={
                  inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }
                }
                transition={{
                  delay: 0.2 + (i / pts.length) * 0.9,
                  duration: 0.3,
                }}
                aria-hidden
              />
            ))}

            {/* Latest weigh-in: a slow chalk pulse. */}
            {active === null && (
              <span
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                style={pct(x(last.day), y(last.kg))}
                aria-hidden
              >
                <motion.span
                  className="absolute top-1/2 left-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-ink"
                  animate={{ scale: [1, 2.4], opacity: [0.8, 0] }}
                  transition={{
                    duration: 1.8,
                    repeat: Infinity,
                    ease: "easeOut",
                    delay: 1.4,
                  }}
                />
                <span className="block size-2.5 rounded-full bg-ink" />
              </span>
            )}

            {/* Low / high flags and the goal tag. */}
            {active === null && (
              <>
                <Flag
                  at={pct(x(high.day), y(high.kg))}
                  above
                  label="High"
                  value={fmtWeight(high.kg, unit)}
                  edge={x(high.day) / W}
                  show={inView}
                />
                {low.day !== high.day && (
                  <Flag
                    at={pct(x(low.day), y(low.kg))}
                    label="Low"
                    value={fmtWeight(low.kg, unit)}
                    edge={x(low.day) / W}
                    show={inView}
                  />
                )}
              </>
            )}
            {goalInView && goal !== null && (
              <span
                className="absolute left-1 -translate-y-full rounded-sm bg-surface px-1 pb-0.5 text-[0.6875rem] font-bold text-ink-variant"
                style={{ top: `${(yU(goal) / H) * 100}%` }}
                aria-hidden
              >
                Goal {goal.toFixed(1)}
              </span>
            )}

            {/* Scrub readout. */}
            <AnimatePresence>
              {shown && (
                <motion.div
                  key="tip"
                  className="pointer-events-none absolute top-0 z-20 w-44 rounded-lg border border-outline bg-surface-high p-3"
                  style={{
                    left: `${(x(shown.day) / W) * 100}%`,
                    translateX:
                      x(shown.day) / W > 0.6 ? "calc(-100% - 12px)" : "12px",
                  }}
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ duration: 0.15 }}
                  aria-live="polite"
                >
                  <p className="text-[0.6875rem] font-bold tracking-wide text-ink-subtle uppercase">
                    {fmtLong(shown.day)}
                  </p>
                  <p className="mt-1 font-display leading-none">
                    <span className="text-3xl font-bold tabular-nums">
                      {fmtWeight(shown.kg, unit)}
                    </span>
                    <span className="ml-1 text-sm text-ink-subtle">{unit}</span>
                  </p>
                  <dl className="mt-2 grid grid-cols-2 gap-x-2 text-xs">
                    <dt className="text-ink-subtle">7-day avg</dt>
                    <dd className="text-right font-display font-bold tabular-nums">
                      {fmtWeight(shown.avg, unit)}
                    </dd>
                    <dt className="text-ink-subtle">vs last</dt>
                    <dd className="text-right font-display font-bold tabular-nums">
                      {prev ? signed(shown.kg - prev.kg, unit) : "—"}
                    </dd>
                  </dl>
                  <div className="mt-2 flex flex-wrap gap-1 border-t border-outline-variant pt-2">
                    {gymByDay.get(shown.day)?.length ? (
                      gymByDay.get(shown.day)!.map((m) => (
                        <span
                          key={m}
                          className="rounded-full px-2 py-0.5 text-[0.6875rem] font-bold"
                          style={{
                            background: PLATE[m].fill,
                            color: PLATE[m].ink,
                          }}
                        >
                          {muscleLabel(m)}
                        </span>
                      ))
                    ) : (
                      <span className="text-[0.6875rem] text-ink-subtle">
                        {gymByDay.has(shown.day) ? "Gym day" : "Rest day"}
                      </span>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* X-axis: start, month starts, end. */}
          <span aria-hidden />
          <div
            className="relative h-4 text-[0.6875rem] font-bold text-ink-subtle"
            aria-hidden
          >
            {months
              .filter((d) => x(d) / W > 0.03 && x(d) / W < 0.97)
              .map((d) => (
                <span
                  key={d}
                  className="absolute -translate-x-1/2 tracking-wide text-ink-variant uppercase"
                  style={{ left: `${(x(d) / W) * 100}%` }}
                >
                  {MONTHS[utc(d).getUTCMonth()]}
                </span>
              ))}
          </div>
        </div>

        {/* Legend. */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-subtle">
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-ink-subtle" aria-hidden />
            Weigh-in ({pts.length})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full bg-ink" aria-hidden />
            7-day average
          </span>
          {goalInView && (
            <span className="flex items-center gap-1.5">
              <span
                className="w-4 border-t-[1.5px] border-dashed border-ink-variant"
                aria-hidden
              />
              Goal
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <span
              className="flex h-3 w-1.5 flex-col gap-px overflow-hidden rounded-[1px]"
              aria-hidden
            >
              <span className="flex-1 bg-plate-chest" />
              <span className="flex-1 bg-plate-back" />
              <span className="flex-1 bg-plate-legs" />
            </span>
            Gym day, by muscle
          </span>
        </div>
      </section>
    </MotionConfig>
  );
}

function Flag({
  at,
  label,
  value,
  above = false,
  edge,
  show,
}: {
  at: { left: string; top: string };
  label: string;
  value: string;
  above?: boolean;
  edge: number;
  show: boolean;
}) {
  const shift = edge > 0.85 ? "-100%" : edge < 0.15 ? "0%" : "-50%";
  return (
    <motion.span
      className="pointer-events-none absolute flex items-baseline gap-1 rounded-sm bg-surface/90 px-1 text-[0.6875rem] font-bold whitespace-nowrap"
      style={{
        ...at,
        translateX: shift,
        translateY: above ? "calc(-100% - 8px)" : "8px",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: show ? 1 : 0 }}
      transition={{ delay: 1.2, duration: 0.4 }}
      aria-hidden
    >
      <span className="tracking-wide text-ink-subtle uppercase">{label}</span>
      <span className="font-display text-xs text-ink tabular-nums">
        {value}
      </span>
    </motion.span>
  );
}
