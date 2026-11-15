"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  AnimatePresence,
  MotionConfig,
  animate,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import type { MuscleRow } from "@/lib/fit-insights";
import { PLATE, muscleLabel } from "@/lib/fit-units";

const utc = (d: string) => new Date(`${d}T00:00:00Z`);
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
/** A week's month(s) and day span: { month: "Oct", days: "19–25" } or { month: "Oct/Nov", days: "26–1" }. */
function weekDates(start: string) {
  const a = utc(start);
  const b = new Date(a.getTime() + 6 * 864e5);
  const [ma, mb] = [MONTHS[a.getUTCMonth()], MONTHS[b.getUTCMonth()]];
  const same = ma === mb;
  return {
    month: same ? ma : `${ma}/${mb}`,
    days: `${a.getUTCDate()}–${b.getUTCDate()}`,
    full: same
      ? `${ma} ${a.getUTCDate()} – ${b.getUTCDate()}`
      : `${ma} ${a.getUTCDate()} – ${mb} ${b.getUTCDate()}`,
  };
}
const range = (start: string) => weekDates(start).full;
const WD = ["M", "T", "W", "T", "F", "S", "S"];

/** Sessions a week per muscle group that counts as "on goal" (the common twice-a-week guideline). */
const GOAL = 2;
/** Plates drawn per cell; the number above the stack still shows the real count. */
const MAX_PLATES = 4;
/** Plate sliver height and gap (px): the goal line sits between plate 2 and plate 3. */
const PLATE_H = 7;
const PLATE_GAP = 2;
const STACK_PAD = 3;
const GOAL_LINE =
  STACK_PAD + GOAL * PLATE_H + (GOAL - 1) * PLATE_GAP + PLATE_GAP / 2;

const ease = [0.2, 0.9, 0.25, 1] as const;
const rowSpring = { type: "spring", stiffness: 420, damping: 34 } as const;

type Status = {
  key: "on" | "low" | "rare" | "none";
  label: string;
  line: (r: MuscleRow) => string;
};
function statusOf(r: MuscleRow): Status {
  if (r.total === 0)
    return {
      key: "none",
      label: "Not trained",
      line: () => "No sessions in the last 8 weeks.",
    };
  if (r.avgPerWeek >= GOAL)
    return {
      key: "on",
      label: "On goal",
      line: (x) =>
        `${x.avgPerWeek}× a week lately, at or above the ${GOAL}× goal.`,
    };
  if (r.avgPerWeek >= 1)
    return {
      key: "low",
      label: "Below goal",
      line: (x) =>
        `${x.avgPerWeek}× a week lately. Add a session in the weeks you miss to reach ${GOAL}×.`,
    };
  return {
    key: "rare",
    label: "Rarely",
    line: (x) =>
      `${x.avgPerWeek}× a week lately, well under the ${GOAL}× goal.`,
  };
}

/**
 * Training frequency: how many sessions each muscle group got in each of the last 8 weeks.
 * Every cell is that week's plate stack (one plate per session) with the count printed above it and
 * a dashed goal line at 2. Tap a row for its drill-down.
 */
export function MuscleMatrix({
  weeks,
  rows,
}: {
  weeks: string[];
  rows: MuscleRow[];
}) {
  const [sel, setSel] = useState(
    () =>
      [...rows].sort((a, b) => b.total - a.total)[0]?.muscle ?? rows[0].muscle,
  );
  const row = rows.find((r) => r.muscle === sel)!;
  const onGoal = rows.filter((r) => r.avgPerWeek >= GOAL).length;
  const grid = useRef<HTMLDivElement>(null);
  const inView = useInView(grid, { once: true, margin: "0px 0px -15% 0px" });
  const cols = {
    gridTemplateColumns: `var(--label-w) repeat(${weeks.length}, minmax(2.625rem, 1fr)) var(--avg-w)`,
  };
  // Phones can't fit 8 dated weeks: start scrolled to the newest one.
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <section
        aria-label="Training frequency: sessions per muscle group per week, last 8 weeks"
        style={{ "--card-i": 1 } as CSSProperties}
        className="card-in flex min-w-0 flex-col gap-5 rounded-2xl border border-outline-variant bg-surface p-4 [--avg-w:2rem] [--label-w:6.5rem] sm:p-6 sm:[--avg-w:3.75rem] sm:[--label-w:7rem]"
      >
        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-3xl leading-none font-bold uppercase">
              Training frequency
            </h2>
            <p className="text-xs text-ink-subtle">
              Sessions per muscle, each week
            </p>
          </div>
          <p
            className="text-right font-display leading-none font-bold tabular-nums"
            aria-label={`${onGoal} of ${rows.length} muscle groups on the ${GOAL} a week goal`}
          >
            <span className="text-3xl">{onGoal}</span>
            <span className="text-lg text-ink-subtle">/{rows.length}</span>
            <span className="block pt-1 font-sans text-[0.6875rem] font-bold tracking-[0.14em] text-ink-subtle uppercase">
              on goal
            </span>
          </p>
        </div>

        <div ref={scroller} className="overflow-x-auto [scrollbar-width:thin]">
          <div ref={grid} className="flex min-w-fit flex-col gap-1">
            {/* Column headers: each week's dates, first day on top and last day under it. */}
            <div
              className="grid items-end gap-x-[3px] pb-1"
              style={cols}
              aria-hidden
            >
              <span className="sticky left-0 z-10 self-stretch bg-surface pl-2 text-[0.6875rem] leading-[2.25rem] font-bold text-ink-subtle">
                Week
              </span>
              {weeks.map((w, i) => {
                const now = i === weeks.length - 1;
                const { month, days } = weekDates(w);
                return (
                  <span
                    key={w}
                    title={`${now ? "This week" : "Week"}: ${range(w)}`}
                    className={`flex flex-col items-center rounded-md py-0.5 font-display leading-tight font-bold tabular-nums ${now ? "bg-primary text-primary-foreground" : ""}`}
                  >
                    <span
                      className={`text-[0.625rem] tracking-wide whitespace-nowrap uppercase ${now ? "opacity-70" : "text-ink-subtle"}`}
                    >
                      {month}
                    </span>
                    <span
                      className={`text-[0.8125rem] whitespace-nowrap ${now ? "" : "text-ink-variant"}`}
                    >
                      {days}
                    </span>
                  </span>
                );
              })}
              <span className="pr-2 text-right text-[0.6875rem] leading-tight font-bold text-ink-subtle">
                Avg
                <br />
                /wk
              </span>
            </div>

            {rows.map((r, ri) => {
              const on = r.muscle === sel;
              const plate = PLATE[r.muscle];
              const st = statusOf(r);
              return (
                <button
                  key={r.muscle}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setSel(r.muscle)}
                  aria-label={`${muscleLabel(r.muscle)}: ${r.avgPerWeek} sessions a week over the last 4 weeks, ${r.total} in 8 weeks. ${st.label}.`}
                  className="group relative grid items-center gap-x-[3px] rounded-xl py-1 text-left"
                  style={cols}
                >
                  {/* Selection: a wash under the row and a ring drawn above the sticky label, gliding between rows. */}
                  {on && (
                    <>
                      <motion.span
                        layoutId="matrix-row"
                        className="absolute inset-0 rounded-xl bg-hover"
                        transition={rowSpring}
                        aria-hidden
                      />
                      <motion.span
                        layoutId="matrix-ring"
                        className="pointer-events-none absolute inset-0 z-20 rounded-xl border border-outline"
                        transition={rowSpring}
                        aria-hidden
                      />
                    </>
                  )}
                  <span
                    className="sticky left-0 z-10 flex h-full min-w-0 items-center gap-2 bg-surface pr-1 pl-2"
                    aria-hidden
                  >
                    {/* Square backing hides scrolled cells; the rounded wash matches the selected row. */}
                    {on && (
                      <span className="absolute inset-0 rounded-l-xl bg-hover" />
                    )}
                    <motion.span
                      className="relative size-3 shrink-0 rounded-full"
                      style={{ background: plate.fill }}
                      animate={{ scale: on ? 1.25 : 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 18,
                      }}
                    />
                    <span
                      className={`relative truncate text-sm font-semibold ${on ? "text-ink" : "text-ink-variant"}`}
                    >
                      {muscleLabel(r.muscle)}
                    </span>
                  </span>

                  {r.perWeek.map((n, i) => {
                    const now = i === weeks.length - 1;
                    const delay = 0.15 + i * 0.045 + ri * 0.06;
                    return (
                      <span
                        key={i}
                        className={`relative flex h-14 flex-col items-stretch rounded-md bg-background transition-opacity duration-300 ${now ? "ring-1 ring-outline" : ""} ${on ? "" : "opacity-75 group-hover:opacity-100"}`}
                        title={`${muscleLabel(r.muscle)}, ${range(weeks[i])}: ${n} session${n === 1 ? "" : "s"}`}
                        aria-hidden
                      >
                        <motion.span
                          className={`h-4 pt-0.5 text-center font-display text-xs leading-none font-bold tabular-nums ${n >= GOAL ? "text-ink" : "text-ink-subtle"}`}
                          initial={{ opacity: 0 }}
                          animate={
                            inView ? { opacity: n ? 1 : 0 } : { opacity: 0 }
                          }
                          transition={{ delay: delay + 0.25, duration: 0.3 }}
                        >
                          {n || ""}
                        </motion.span>
                        <span
                          className="relative flex flex-1 flex-col-reverse px-[3px]"
                          style={{ gap: PLATE_GAP, paddingBottom: STACK_PAD }}
                        >
                          <span
                            className="pointer-events-none absolute inset-x-0.5 border-t border-dashed border-ink-subtle/60"
                            style={{ bottom: GOAL_LINE }}
                          />
                          {Array.from(
                            { length: Math.min(n, MAX_PLATES) },
                            (_, k) => (
                              <motion.span
                                key={k}
                                className="relative shrink-0 rounded-[2px]"
                                style={{
                                  height: PLATE_H,
                                  background: plate.fill,
                                }}
                                initial={{ opacity: 0, y: -14, scaleX: 0.6 }}
                                animate={
                                  inView
                                    ? { opacity: 1, y: 0, scaleX: 1 }
                                    : { opacity: 0, y: -14, scaleX: 0.6 }
                                }
                                transition={{
                                  delay: delay + k * 0.07,
                                  duration: 0.55,
                                  ease: [0.2, 1.4, 0.4, 1],
                                }}
                              />
                            ),
                          )}
                        </span>
                      </span>
                    );
                  })}

                  <span
                    className="relative pr-2 text-right font-display text-lg leading-none font-bold tabular-nums"
                    aria-hidden
                  >
                    <span
                      className={
                        r.avgPerWeek >= GOAL ? "text-ink" : "text-ink-variant"
                      }
                    >
                      {r.avgPerWeek}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend: what one plate and the dashed line mean. */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-subtle">
          <span className="flex items-center gap-1.5">
            <span className="h-[7px] w-4 rounded-[2px] bg-steel" aria-hidden />1
            plate = 1 session
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="w-5 border-t border-dashed border-ink-subtle"
              aria-hidden
            />
            Goal {GOAL} a week
          </span>
          <span>Avg = last 4 weeks</span>
          <span className="sm:hidden">Swipe right for older weeks</span>
        </div>

        <Drilldown row={row} />
      </section>
    </MotionConfig>
  );
}

function Drilldown({ row }: { row: MuscleRow }) {
  const st = statusOf(row);
  const plate = PLATE[row.muscle];
  const maxWd = Math.max(1, ...row.byWeekday);
  const meterMax = GOAL + 1;
  const fill = Math.min(row.avgPerWeek, meterMax) / meterMax;

  return (
    <div
      className="relative overflow-hidden border-t border-outline-variant pt-5"
      aria-live="polite"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={row.muscle}
          className="grid gap-5 sm:grid-cols-[1fr_auto] sm:gap-8"
          initial={{ opacity: 0, x: 24, filter: "blur(6px)" }}
          animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, x: -24, filter: "blur(6px)" }}
          transition={{ duration: 0.32, ease }}
        >
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className="size-4 rounded-full shadow-[inset_0_0_0_3px_rgb(0_0_0/0.3)]"
                style={{ background: plate.fill }}
                aria-hidden
              />
              <h3 className="font-display text-2xl leading-none font-bold uppercase">
                {muscleLabel(row.muscle)}
              </h3>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[0.6875rem] font-bold tracking-wide uppercase ${st.key === "on" ? "bg-primary text-primary-foreground" : "bg-primary-soft text-ink"}`}
              >
                {st.label}
              </span>
            </div>
            <p className="max-w-[40ch] text-sm text-ink-variant">
              {st.line(row)}
            </p>

            {/* Goal meter: 0 to 3 a week, tick at the goal. */}
            <div className="flex flex-col gap-1.5">
              <div
                className="relative h-3 rounded-full bg-track"
                role="img"
                aria-label={`${row.avgPerWeek} of ${GOAL} sessions a week goal`}
              >
                <motion.span
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ background: plate.fill }}
                  initial={{ width: 0 }}
                  animate={{ width: `${fill * 100}%` }}
                  transition={{ duration: 0.8, ease, delay: 0.1 }}
                />
                <span
                  className="absolute -inset-y-1 w-0.5 rounded-full bg-ink"
                  style={{ left: `${(GOAL / meterMax) * 100}%` }}
                  aria-hidden
                />
              </div>
              <div
                className="relative h-4 text-[0.6875rem] font-bold text-ink-subtle tabular-nums"
                aria-hidden
              >
                <span className="absolute left-0">0</span>
                <span
                  className="absolute -translate-x-1/2 text-ink"
                  style={{ left: `${(GOAL / meterMax) * 100}%` }}
                >
                  goal {GOAL}
                </span>
                <span className="absolute right-0">{meterMax}+/wk</span>
              </div>
            </div>

            <dl className="grid grid-cols-3 divide-x divide-outline-variant border-y border-outline-variant py-3 text-center">
              <Stat
                label="Last trained"
                value={row.daysSince}
                unit={row.daysSince === 0 ? "" : "d ago"}
                empty="never"
                zero="today"
              />
              <Stat
                label="Longest gap"
                value={row.longestGap}
                unit="days"
                empty="—"
              />
              <Stat
                label="8 weeks"
                value={row.total}
                unit="sessions"
                empty="0"
              />
            </dl>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs text-ink-subtle">
              {row.favourite
                ? `Usually on ${row.favourite}`
                : "No sessions yet"}
            </span>
            <div
              className="flex h-20 items-end gap-1.5"
              role="img"
              aria-label={`${muscleLabel(row.muscle)} sessions by weekday: ${row.byWeekday.join(", ")}`}
            >
              {row.byWeekday.map((n, i) => {
                const top = n > 0 && n === maxWd;
                return (
                  <div key={i} className="flex w-7 flex-col items-center gap-1">
                    <span
                      className={`font-display text-xs leading-none font-bold tabular-nums ${top ? "text-ink" : "text-ink-subtle"}`}
                    >
                      {n || ""}
                    </span>
                    <motion.span
                      className="w-full origin-bottom rounded-[3px]"
                      style={{
                        height: Math.max(4, (n / maxWd) * 44),
                        background: n ? plate.fill : "var(--track)",
                      }}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{
                        delay: 0.12 + i * 0.05,
                        duration: 0.5,
                        ease: [0.2, 1.3, 0.4, 1],
                      }}
                    />
                    <span
                      className={`text-[0.6875rem] font-bold ${top ? "text-ink" : "text-ink-subtle"}`}
                    >
                      {WD[i]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  empty,
  zero,
}: {
  label: string;
  value: number | null;
  unit: string;
  empty: string;
  zero?: string;
}) {
  const word = value === null ? empty : value === 0 && zero ? zero : null;
  return (
    <div className="flex flex-col gap-0.5 px-1">
      <dt className="text-[0.6875rem] text-ink-subtle">{label}</dt>
      <dd className="font-display text-2xl leading-tight font-bold tabular-nums">
        {word ?? <CountUp to={value!} />}
        {!word && unit && (
          <span className="ml-1 text-xs text-ink-subtle">{unit}</span>
        )}
      </dd>
    </div>
  );
}

/** Rolls a stat up from 0 whenever the selection changes. */
function CountUp({ to }: { to: number }) {
  const reduce = useReducedMotion();
  const el = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (reduce || !el.current) return;
    const node = el.current;
    const c = animate(0, to, {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (x) => (node.textContent = String(Math.round(x))),
    });
    return () => c.stop();
  }, [to, reduce]);
  return <span ref={el}>{to}</span>;
}
