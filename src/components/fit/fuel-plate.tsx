"use client";

import { useEffect, useId, useRef } from "react";
import { animate, motion, useReducedMotion } from "motion/react";
import type { Mood } from "@/lib/fit-mascot";
import type { Targets } from "@/lib/fit-nutrition";
import { Dumbo } from "./dumbo";

type Totals = { kcal: number; protein: number; carbs: number; fiber: number };
type Key = keyof Totals;

/**
 * The rings, outside in. Each has its own colour (CSS vars in fit.css) and sweeps 300°; the 60° gap at
 * the top-left carries its name, written along the curve in the ring's colour.
 */
const RINGS: { k: Key; label: string; tile: string; r: number; w: number; color: string; unit: string }[] = [
  { k: "kcal", label: "KCAL", tile: "Calories", r: 84, w: 11, color: "var(--macro-kcal)", unit: "" },
  { k: "protein", label: "PROTEIN", tile: "Protein", r: 68, w: 9, color: "var(--macro-protein)", unit: "g" },
  { k: "carbs", label: "CARBS", tile: "Carbs", r: 55, w: 9, color: "var(--macro-carbs)", unit: "g" },
  { k: "fiber", label: "FIBER", tile: "Fiber", r: 42, w: 9, color: "var(--macro-fiber)", unit: "g" },
];
const SWEEP = 300; // degrees of each ring used for the value
const C = 100; // centre
const spring = { type: "spring", stiffness: 90, damping: 18, mass: 0.9 } as const;

const pt = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return `${(C + r * Math.cos(a)).toFixed(2)} ${(C + r * Math.sin(a)).toFixed(2)}`;
};
/** Clockwise arc from 12 o'clock (−90°) through `sweep` degrees. */
const arc = (r: number, sweep: number) => `M ${pt(r, -90)} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${pt(r, -90 + sweep)}`;
/** The label path: through the gap, from the end of the sweep back up toward 12 o'clock. */
const gap = (r: number) => `M ${pt(r, -90 + SWEEP + 5)} A ${r} ${r} 0 0 1 ${pt(r, 265)}`;

/** Rolls a number from its last value to the new one (no roll on first paint or under reduced motion). */
function Roll({ to }: { to: number }) {
  const reduce = useReducedMotion();
  const el = useRef<HTMLSpanElement>(null);
  const prev = useRef(to);
  useEffect(() => {
    const node = el.current;
    const from = prev.current;
    prev.current = to;
    if (reduce || !node || from === to) return;
    const c = animate(from, to, { duration: 0.7, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => (node.textContent = String(Math.round(v))) });
    return () => c.stop();
  }, [to, reduce]);
  return <span ref={el}>{Math.round(to)}</span>;
}

/** Dumbo reacts to the day so far. */
function moodFor(t: Totals, targets: Targets | null): Mood {
  if (t.kcal <= 0) return "curious";
  if (!targets) return "happy";
  if (t.kcal > targets.kcal * 1.15) return "shocked";
  if (t.protein >= targets.protein) return "proud";
  return "happy";
}

/**
 * The day's fuel as a bumper-plate gauge: four labelled rings (calories, protein, carbs, fiber), each in
 * its own colour, filling toward its target; any calories over target run on as a dashed inner lap.
 * The hub counts what's left, Dumbo reacts, and matching tiles below give the exact numbers.
 */
export function FuelPlate({ totals, targets }: { totals: Totals; targets: Targets | null }) {
  const uid = useId().replace(/:/g, "");
  const frac = (k: Key) => {
    const t = targets?.[k];
    if (t) return Math.max(0, totals[k] / t);
    return totals[k] > 0 ? 1 : 0; // no targets: a full ring just means "eaten some"
  };
  const left = targets ? Math.round(targets.kcal - totals.kcal) : null;
  const over = left !== null && left < 0;
  const ticks = Array.from({ length: 24 }, (_, i) => i * 15);

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative shrink-0">
        <svg
          viewBox="0 0 200 200"
          className="size-64 sm:size-60 lg:size-64"
          role="img"
          aria-label={
            targets
              ? `${Math.round(totals.kcal)} of ${targets.kcal} kcal, ${over ? `${-left!} over` : `${left} left`}. Protein ${Math.round(totals.protein)} of ${targets.protein} g, carbs ${Math.round(totals.carbs)} of ${targets.carbs} g, fiber ${Math.round(totals.fiber)} of ${targets.fiber} g.`
              : `${Math.round(totals.kcal)} kcal, ${Math.round(totals.protein)} g protein, ${Math.round(totals.carbs)} g carbs, ${Math.round(totals.fiber)} g fiber`
          }
        >
          <defs>
            {RINGS.map((g) => (
              <path key={g.k} id={`${uid}-${g.k}`} d={gap(g.r)} />
            ))}
          </defs>
          {/* Plate body and moulded rim notches. */}
          <circle cx={C} cy={C} r="99" fill="var(--panel-high)" />
          <circle cx={C} cy={C} r="99" fill="none" stroke="#000" strokeOpacity="0.35" strokeWidth="2" />
          {ticks.map((a) => (
            <line key={a} x1={C} y1="3" x2={C} y2={a % 90 === 0 ? 9 : 6} stroke="var(--outline)" strokeWidth={a % 90 === 0 ? 1.6 : 0.8} transform={`rotate(${a} ${C} ${C})`} />
          ))}

          {RINGS.map((g, i) => {
            const f = frac(g.k);
            return (
              <g key={g.k}>
                {/* Track, value, and the name in the gap. */}
                <path d={arc(g.r, SWEEP)} fill="none" stroke="var(--track)" strokeWidth={g.w} strokeLinecap="round" />
                <motion.path
                  d={arc(g.r, SWEEP)}
                  fill="none"
                  stroke={g.color}
                  strokeWidth={g.w}
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: Math.min(1, f), opacity: f > 0 ? 1 : 0 }}
                  transition={{ ...spring, delay: 0.08 * i }}
                />
                {g.k === "kcal" && over && (
                  <motion.path
                    d={arc(g.r - 9.5, SWEEP)}
                    fill="none"
                    stroke={g.color}
                    strokeWidth="2.5"
                    strokeDasharray="3 3"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: Math.min(1, f - 1) }}
                    transition={spring}
                  />
                )}
                <text
                  fill={g.color}
                  fontSize={g.k === "kcal" ? 8 : 6.8}
                  fontWeight="800"
                  letterSpacing="0.6"
                  dominantBaseline="central"
                  style={{ fontFamily: "var(--font-archivo)" }}
                >
                  <textPath href={`#${uid}-${g.k}`} startOffset="50%" textAnchor="middle">
                    {g.label}
                  </textPath>
                </text>
              </g>
            );
          })}

          {/* Hub. */}
          <circle cx={C} cy={C} r="31" fill="var(--rubber)" stroke="var(--outline)" strokeWidth="1" />
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="flex flex-col items-center leading-none">
            <span className="font-display text-[2.1rem] font-bold tabular-nums">
              <Roll to={left === null ? totals.kcal : Math.abs(left)} />
            </span>
            <span className="mt-0.5 text-[0.625rem] font-bold tracking-[0.14em] text-ink-subtle uppercase">
              {left === null ? "kcal" : over ? "kcal over" : "kcal left"}
            </span>
          </div>
        </div>
        <span className="pointer-events-none absolute -right-4 -bottom-2">
          <Dumbo mood={moodFor(totals, targets)} size={70} />
        </span>
      </div>

      {/* Tiles: same colours as the rings, exact numbers. */}
      <dl className="grid w-full min-w-0 grid-cols-2 gap-2">
        {RINGS.map((g, i) => {
          const t = targets?.[g.k];
          const p = t ? Math.min(1, totals[g.k] / t) : 0;
          return (
            <div key={g.k} className="flex min-w-0 flex-col gap-1.5 rounded-xl border border-outline-variant bg-background px-3 py-2.5">
              <dt className="flex items-center gap-1.5 text-[0.6875rem] font-bold tracking-[0.1em] text-ink-subtle uppercase">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: g.color }} aria-hidden />
                {g.tile}
              </dt>
              <dd className="font-display text-2xl leading-none font-bold tabular-nums">
                <Roll to={totals[g.k]} />
                <span className="ml-0.5 text-xs text-ink-subtle">
                  {t ? `/${t}` : ""}
                  {g.unit}
                </span>
              </dd>
              {t ? (
                <span className="h-1 overflow-hidden rounded-full bg-track" aria-hidden>
                  <motion.span
                    className="block h-full origin-left rounded-full"
                    style={{ background: g.color }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: p }}
                    transition={{ ...spring, delay: 0.08 * i }}
                  />
                </span>
              ) : null}
            </div>
          );
        })}
      </dl>
    </div>
  );
}
