"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import type { StreakStats } from "@/lib/fit-insights";

const EASE = [0.2, 0.9, 0.25, 1] as const;
const MONTH_LETTERS = "JFMAMJJASOND";

/** A number that counts up from 0 once the card is on screen. */
function Count({ value, go }: { value: number; go: boolean }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(reduce ? value : 0);
  const text = useTransform(mv, (v) => Math.round(v).toString());
  useEffect(() => {
    if (!go) return;
    if (reduce) return mv.set(value);
    const c = animate(mv, value, { duration: 1.1, ease: EASE });
    return () => c.stop();
  }, [go, value, reduce, mv]);
  return <motion.span className="tabular-nums">{text}</motion.span>;
}

/** The flame: flickers, glows and throws a few embers. Asleep (💤) at zero. */
function Flame({ lit, big }: { lit: boolean; big: boolean }) {
  const reduce = useReducedMotion();
  if (!lit) {
    return (
      <motion.span
        aria-hidden
        className="grid size-20 place-items-center text-5xl"
        animate={reduce ? {} : { y: [0, -4, 0], rotate: [0, -4, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      >
        💤
      </motion.span>
    );
  }
  return (
    <span aria-hidden className="relative grid size-20 place-items-center">
      {/* Glow under the flame (amber into coral), breathing. */}
      <motion.span
        className="absolute inset-0 rounded-full blur-xl"
        style={{ background: "radial-gradient(circle, var(--viz-goal) 0%, var(--viz-bad) 45%, transparent 72%)" }}
        animate={reduce ? { opacity: 0.45 } : { opacity: [0.35, 0.65, 0.4, 0.6, 0.35], scale: [0.9, 1.08, 0.95, 1.05, 0.9] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Embers drifting up. */}
      {!reduce &&
        [0, 1, 2, 3].map((i) => (
          <motion.span
            key={i}
            className="absolute bottom-6 size-1 rounded-full"
            style={{ left: `${30 + i * 13}%`, background: i % 2 ? "var(--viz-goal)" : "var(--viz-bad)" }}
            animate={{ y: [0, -46 - i * 6], x: [0, i % 2 ? 6 : -6], opacity: [0, 1, 0], scale: [1, 0.4] }}
            transition={{ duration: 1.6 + i * 0.25, repeat: Infinity, delay: i * 0.45, ease: "easeOut" }}
          />
        ))}
      <motion.span
        className={`relative leading-none ${big ? "text-6xl" : "text-5xl"}`}
        style={{ transformOrigin: "50% 85%" }}
        animate={reduce ? {} : { scale: [1, 1.08, 0.97, 1.05, 1], rotate: [0, -3, 2, -2, 0], y: [0, -2, 0, -1, 0] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      >
        🔥
      </motion.span>
    </span>
  );
}

/**
 * Gym streak (weeks in a row with a gym day) as a live flame, plus gym days this month (a day strip)
 * and this year (twelve month bars). Label + number rows, visuals instead of sentences.
 */
export function StreakCard({ s, today }: { s: StreakStats; today: string }) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -15% 0px" });
  const reduce = useReducedMotion();
  const lit = s.weekStreak > 0;
  const maxMonth = Math.max(1, ...s.perMonth.map((v) => v ?? 0));
  const isBest = lit && s.weekStreak >= s.bestWeekStreak;

  return (
    <section
      ref={ref}
      aria-label={`Gym streak: ${s.weekStreak} ${s.weekStreak === 1 ? "week" : "weeks"} in a row${s.thisWeek || !lit ? "" : ", train this week to keep it"}. Best ${s.bestWeekStreak} weeks. ${s.month} gym days this month, ${s.year} this year.`}
      className="card-in flex flex-col gap-4 overflow-hidden rounded-2xl border border-outline-variant bg-surface p-4 sm:p-5 md:col-span-7 lg:p-6"
      style={{ "--card-i": 2 } as CSSProperties}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-bold tracking-[0.14em] text-ink-variant uppercase">Streak</h2>
        <span className="font-mono text-[11px] text-ink-subtle">best {s.bestWeekStreak} wk</span>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-[auto_1fr] sm:gap-6">
        {/* The flame and the week streak. */}
        <div aria-hidden className="flex items-center gap-3 sm:flex-col sm:items-start sm:justify-center sm:gap-1">
          <Flame lit={lit} big={s.weekStreak >= 4} />
          <div>
            <p className="font-display text-6xl leading-none font-bold">
              <Count value={s.weekStreak} go={inView} />
              <span className="ml-1.5 text-lg text-ink-subtle">wk</span>
            </p>
            <motion.p
              className="mt-1 inline-flex rounded-full border px-2 py-0.5 font-mono text-[11px]"
              style={{
                borderColor: !lit ? "var(--outline)" : s.thisWeek ? "color-mix(in oklab, var(--viz-goal) 50%, transparent)" : "color-mix(in oklab, var(--viz-bad) 60%, transparent)",
                color: !lit ? "var(--chalk-subtle)" : s.thisWeek ? "var(--viz-goal)" : "var(--viz-bad)",
              }}
              animate={lit && !s.thisWeek && !reduce ? { opacity: [1, 0.55, 1] } : {}}
              transition={{ duration: 1.6, repeat: Infinity }}
            >
              {!lit ? "light it this week" : !s.thisWeek ? "⏳ train this week" : isBest ? "🏆 best run" : "in a row"}
            </motion.p>
          </div>
        </div>

        {/* Month and year: label + number, a small visual under each. */}
        <dl className="flex flex-col divide-y divide-outline-variant">
          <div className="flex flex-1 flex-col justify-center gap-2 pb-3">
            <div className="flex items-baseline justify-between">
              <dt className="text-sm font-semibold text-ink-variant">This month</dt>
              <dd className="font-display text-3xl leading-none font-bold">
                <Count value={s.month} go={inView} />
              </dd>
            </div>
            <div aria-hidden className="flex gap-[3px]">
              {s.monthDays.map((d, i) => (
                <motion.span
                  key={d.day}
                  className={`h-3 flex-1 rounded-[3px] ${d.future ? "border border-dashed border-outline-variant" : d.gym ? "" : "bg-track"} ${d.day === today ? "ring-1 ring-ink ring-offset-1 ring-offset-surface" : ""}`}
                  style={d.gym ? { background: "linear-gradient(to top, var(--viz-bad), var(--viz-goal))" } : undefined}
                  initial={reduce ? false : { scaleY: 0 }}
                  animate={inView ? { scaleY: 1 } : {}}
                  transition={{ duration: 0.3, delay: 0.3 + i * 0.015, ease: EASE }}
                />
              ))}
            </div>
          </div>
          <div className="flex flex-1 flex-col justify-center gap-2 pt-3">
            <div className="flex items-baseline justify-between">
              <dt className="text-sm font-semibold text-ink-variant">This year</dt>
              <dd className="font-display text-3xl leading-none font-bold">
                <Count value={s.year} go={inView} />
              </dd>
            </div>
            <div aria-hidden className="grid grid-cols-12 gap-1">
              {s.perMonth.map((v, m) => (
                <div key={m} className="flex flex-col items-center gap-1">
                  <div className="flex h-9 w-full items-end">
                    <motion.span
                      className={`w-full origin-bottom rounded-[3px] ${v === null ? "border border-dashed border-outline-variant" : !v ? "bg-track" : ""}`}
                      style={{
                        height: v === null ? "100%" : `${Math.max(10, (v / maxMonth) * 100)}%`,
                        background: v ? (m === s.monthIndex ? "linear-gradient(to top, var(--viz-bad), var(--viz-goal))" : "color-mix(in oklab, var(--viz-goal) 55%, transparent)") : undefined,
                      }}
                      initial={reduce ? false : { scaleY: 0 }}
                      animate={inView ? { scaleY: 1 } : {}}
                      transition={{ duration: 0.45, delay: 0.5 + m * 0.04, ease: EASE }}
                    />
                  </div>
                  <span className={`font-mono text-[9px] ${m === s.monthIndex ? "text-ink" : "text-ink-subtle"}`}>{MONTH_LETTERS[m]}</span>
                </div>
              ))}
            </div>
          </div>
        </dl>
      </div>
    </section>
  );
}
