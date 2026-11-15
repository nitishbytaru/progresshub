"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useAnimationControls, useReducedMotion } from "motion/react";
import type { Exercise } from "@/lib/fit-exercises";
import type { WorkoutSet } from "@/lib/fit";
import { fmtWeight, type Unit } from "@/lib/fit-units";

/**
 * Today's session as a loaded barbell: every set is a bumper plate on both sleeves (mirrored, collar
 * outward in the order you lifted), coloured by exercise and as tall as the weight was heavy relative
 * to your heaviest set today; bodyweight sets are slim steel-edged plates. New plates slide on from
 * the end of the sleeve, overshoot and clank, and the bar gives one shake.
 */
export function SessionBar({ sets, byKey, unit }: { sets: WorkoutSet[]; byKey: Map<string, Exercise>; unit: Unit }) {
  const reduce = useReducedMotion();
  const shake = useAnimationControls();
  // Plates already on the bar at first paint don't animate; later ones clank on.
  const [firstPaint] = useState(() => new Set(sets.map((s) => s.id)));
  const prevCount = useRef(sets.length);
  useEffect(() => {
    if (sets.length > prevCount.current && !reduce) {
      shake.start({ x: [0, -3, 3, -1.5, 0], transition: { duration: 0.42, delay: 0.32 } });
    }
    prevCount.current = sets.length;
  }, [sets.length, reduce, shake]);

  const maxKg = Math.max(1, ...sets.map((s) => s.weight_kg));
  // Collar outward: the first set sits next to the collar.
  const plates = sets.map((s, i) => {
    const ex = byKey.get(s.exercise_key);
    const h = s.weight_kg > 0 ? 46 + 54 * (s.weight_kg / maxKg) : 34;
    return { s, ex, h, i, fresh: !firstPaint.has(s.id) };
  });
  const freshOrder = plates.filter((p) => p.fresh).map((p) => p.s.id);

  const sleeve = (side: -1 | 1) => (
    <div className={`relative flex h-full min-w-0 flex-1 items-center ${side < 0 ? "flex-row-reverse" : ""}`}>
      {/* Sleeve tube, end cap. */}
      <span className="absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 rounded-full bg-steel/80" aria-hidden />
      <span className={`absolute top-1/2 h-5 w-1.5 -translate-y-1/2 rounded-sm bg-steel ${side < 0 ? "left-0" : "right-0"}`} aria-hidden />
      <div className={`relative flex h-full items-center gap-[2px] ${side < 0 ? "flex-row-reverse pr-0.5" : "pl-0.5"}`}>
        {plates.map((p) => {
          const k = freshOrder.indexOf(p.s.id);
          return (
            <motion.span
              key={p.s.id}
              title={`${p.ex?.name ?? "Set"}: ${p.s.weight_kg ? `${fmtWeight(p.s.weight_kg, unit)} ${unit}` : "bodyweight"} × ${p.s.reps}`}
              className={`relative shrink-0 rounded-[3px] shadow-[inset_0_0_0_1.5px_rgb(0_0_0/0.28)] ${p.s.weight_kg > 0 ? "w-2.5 sm:w-3" : "w-1.5"}`}
              style={{ background: p.ex?.color ?? "var(--steel)" }}
              initial={p.fresh && !reduce ? { x: side * 90, opacity: 0, height: `${p.h}%` } : { height: `${p.h}%` }}
              // Heights rescale (ease, not snap) when a heavier set raises today's top weight.
              animate={{ x: 0, opacity: 1, height: `${p.h}%` }}
              transition={{ type: "spring", stiffness: 520, damping: 17, mass: 0.7, delay: 0.08 + Math.max(0, k) * 0.09 }}
              aria-hidden
            />
          );
        })}
      </div>
    </div>
  );

  return (
    <motion.div
      animate={shake}
      role="img"
      aria-label={sets.length ? `Today's bar: ${sets.length} set${sets.length === 1 ? "" : "s"} loaded` : "Today's bar is empty"}
      className="relative flex h-28 items-center rounded-2xl bg-background px-3 sm:h-32"
    >
      {sleeve(-1)}
      {/* Collars and the knurled shaft. */}
      <span className="relative z-10 h-9 w-2 shrink-0 rounded-sm bg-steel" aria-hidden />
      <span
        className="relative h-2.5 w-14 shrink-0 rounded-sm bg-steel/70 sm:w-20"
        style={{ backgroundImage: "repeating-linear-gradient(90deg, transparent 0 2px, rgb(0 0 0 / 0.28) 2px 3px)" }}
        aria-hidden
      />
      <span className="relative z-10 h-9 w-2 shrink-0 rounded-sm bg-steel" aria-hidden />
      {sleeve(1)}
      {!sets.length && (
        <span className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-xs text-ink-subtle">Empty bar: your first set loads here</span>
      )}
    </motion.div>
  );
}
