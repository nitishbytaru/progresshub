"use client";

import { useEffect, useState, type ReactNode } from "react";
import { MotionConfig, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Dumbbell } from "lucide-react";

/** Fired by any "Log sets" button (e.g. the log flow's finale) to slide the Sets pane in. */
export const SHOW_SETS_EVENT = "fit:show-sets";
export const showSets = () => window.dispatchEvent(new Event(SHOW_SETS_EVENT));

type View = "weigh" | "sets";

/**
 * The Log page as two panes side by side: the weigh-in (heading, flow, history) and the sets logger.
 * "Log sets" slides the whole weigh-in out to the left and the sets in from the right; "Weigh-in"
 * slides back. Both stay mounted, so a half-done weigh-in or set is never lost.
 */
export function LogStage({
  heading,
  weigh,
  sets,
  gymToday,
  actions,
}: {
  heading: ReactNode;
  weigh: ReactNode;
  sets: ReactNode | null;
  /** Today is logged as a gym day: only then can sets be logged (rest days hide "Log sets"). */
  gymToday: boolean;
  /** Always-on buttons beside "Log sets" (e.g. Recovery). */
  actions?: ReactNode;
}) {
  const reduce = useReducedMotion();
  const [picked, setPicked] = useState<View>("weigh");
  // Sets only exist on a gym day; if today turns into a rest day, fall back to the weigh-in.
  const canSets = Boolean(sets) && gymToday;
  const view: View = canSets ? picked : "weigh";
  const go = (v: View) => {
    setPicked(v);
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  };
  useEffect(() => {
    const on = () => {
      setPicked("sets");
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener(SHOW_SETS_EVENT, on);
    return () => window.removeEventListener(SHOW_SETS_EVENT, on);
  }, []);

  const pane = (v: View) => {
    const active = view === v;
    const off = v === "weigh" ? "-100%" : "100%";
    return {
      initial: false as const,
      animate: active ? { x: "0%", opacity: 1, filter: "blur(0px)" } : { x: off, opacity: 0, filter: reduce ? "blur(0px)" : "blur(4px)" },
      transition: { type: "spring" as const, stiffness: 260, damping: 32, mass: 0.9 },
      className: `w-full ${active ? "relative" : "pointer-events-none absolute inset-x-0 top-0 max-h-dvh overflow-hidden"}`,
      inert: !active,
      "aria-hidden": !active,
    };
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative overflow-x-clip">
        <motion.div {...pane("weigh")}>
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3 pt-6 pb-6 sm:pt-10 lg:pb-8">
            {heading}
            <div className="mb-1 flex flex-wrap items-center gap-2">
            {actions}
            {canSets && (
              <motion.button
                type="button"
                onClick={() => go("sets")}
                whileTap={{ scale: 0.95 }}
                className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-outline px-4 text-sm font-bold text-ink-variant transition-colors hover:bg-hover hover:text-ink"
              >
                <Dumbbell className="size-4" aria-hidden /> Log sets
                <ArrowRight className="size-4" aria-hidden />
              </motion.button>
            )}
            </div>
          </div>
          {weigh}
        </motion.div>

        {sets && (
          <motion.div {...pane("sets")}>
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3 pt-6 pb-6 sm:pt-10 lg:pb-8">
              <h1 className="font-display text-5xl leading-[0.9] font-bold tracking-[-0.01em] uppercase sm:text-6xl">
                Sets.
                <br />
                <span className="text-ink-subtle">Lift it.</span>
              </h1>
              <motion.button
                type="button"
                onClick={() => go("weigh")}
                whileTap={{ scale: 0.95 }}
                className="mb-1 inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-outline px-4 text-sm font-bold text-ink-variant transition-colors hover:bg-hover hover:text-ink"
              >
                <ArrowLeft className="size-4" aria-hidden /> Weigh-in
              </motion.button>
            </div>
            {sets}
          </motion.div>
        )}
      </div>
    </MotionConfig>
  );
}
