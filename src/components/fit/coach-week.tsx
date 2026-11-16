"use client";

import { useTransition, type CSSProperties } from "react";
import { MotionConfig, motion } from "motion/react";
import { Check, Moon, RefreshCw, Sparkles } from "lucide-react";
import { generateWeekPlan } from "@/app/(fit)/fit/coach/actions";
import type { MergedDay } from "@/lib/fit-coach-plan";
import { PLATE, muscleLabel } from "@/lib/fit-units";
import { fitBusy, fitError, fitToast } from "./fit-toast";
import { PlateLoader } from "./plate-loader";

const utc = (d: string) => new Date(`${d}T00:00:00Z`);

/**
 * This week's training as seven cards, Monday to Sunday. Completed days show what you actually
 * trained (with the original plan struck through when you swapped); the button generates the week,
 * or re-plans the remaining days around what's done when your logs differ from the plan.
 */
export function CoachWeek({
  days,
  hasPlan,
  needsUpdate,
  planKey,
  gymTarget,
  completedGym,
  today,
}: {
  days: MergedDay[];
  hasPlan: boolean;
  needsUpdate: boolean;
  /** Changes on every (re)generation, so the cards flip in again. */
  planKey: string;
  gymTarget: number;
  completedGym: number;
  today: string;
}) {
  const [pending, start] = useTransition();
  const label = !hasPlan ? "Generate this week's training" : needsUpdate ? "Update the schedule" : "Re-plan remaining days";

  const run = () =>
    start(async () => {
      fitBusy(hasPlan ? "Re-planning your week…" : "Planning your week…");
      const r = await generateWeekPlan();
      if (r.error) return void fitError(r.error, "Plan not saved");
      fitToast({
        title: hasPlan ? "Schedule updated" : "Your week is planned",
        detail: r.source === "rules" ? "Planned from your training history (AI was busy)" : "Completed days kept; the rest is planned around them",
        mood: "proud",
      });
    });

  return (
    <MotionConfig reducedMotion="user">
      <section aria-label="This week's training" className="card-in flex flex-col gap-5 rounded-3xl border border-outline-variant bg-surface p-4 sm:p-6" style={{ "--card-i": 1 } as CSSProperties}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-3xl leading-none font-bold uppercase">Training week</h2>
            <p className="text-sm text-ink-subtle">
              <span className="font-display text-lg font-bold text-ink tabular-nums">
                {completedGym}/{gymTarget}
              </span>{" "}
              sessions done · Sunday is your day off
            </p>
          </div>
          <motion.button
            type="button"
            onClick={run}
            disabled={pending}
            whileTap={{ scale: 0.96 }}
            className={`relative inline-flex h-12 items-center gap-2 rounded-full px-5 font-bold transition-colors disabled:opacity-60 ${
              !hasPlan || needsUpdate ? "bg-primary text-primary-foreground hover:bg-primary-hover" : "border border-outline text-ink-variant hover:bg-hover hover:text-ink"
            }`}
          >
            {needsUpdate && !pending && (
              <motion.span
                className="absolute inset-0 rounded-full border-2 border-ink"
                initial={{ scale: 1, opacity: 0.7 }}
                animate={{ scale: 1.18, opacity: 0 }}
                transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 0.8 }}
                aria-hidden
              />
            )}
            {pending ? <PlateLoader size="sm" /> : hasPlan ? <RefreshCw className="size-4" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
            {pending ? "Planning…" : label}
          </motion.button>
        </div>

        <ol className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {days.map((d, i) => {
            const isToday = d.day === today;
            const done = d.status === "done";
            const off = d.status === "off";
            const empty = !hasPlan && !done && d.status !== "rest-logged" && !off;
            return (
              <motion.li
                key={`${planKey}-${d.day}`}
                initial={{ rotateY: -90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 22, delay: i * 0.07 }}
                style={{ transformPerspective: 700 } as CSSProperties}
                className={`relative flex min-h-36 flex-col gap-2 rounded-2xl border p-2.5 sm:min-h-44 ${
                  isToday ? "border-ink bg-hover" : done ? "border-outline bg-background" : "border-outline-variant bg-background"
                } ${off || d.status === "missed" ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between gap-1">
                  <span className="flex flex-col leading-none">
                    <span className={`text-[0.6875rem] font-bold tracking-wide uppercase ${isToday ? "text-ink" : "text-ink-subtle"}`}>{isToday ? "Today" : d.weekday}</span>
                    <span className="font-display text-2xl font-bold tabular-nums">{utc(d.day).getUTCDate()}</span>
                  </span>
                  {done && (
                    <span className="grid size-6 place-items-center rounded-full bg-primary text-primary-foreground" title="Completed">
                      <Check className="size-3.5" strokeWidth={3} aria-hidden />
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col justify-center gap-1.5">
                  {empty ? (
                    <span className="grid h-10 place-items-center rounded-xl border border-dashed border-outline font-display text-xl text-ink-subtle">?</span>
                  ) : d.rest || off ? (
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-ink-subtle">
                      <Moon className="size-4" aria-hidden /> {off ? "Day off" : "Rest"}
                    </span>
                  ) : (
                    <>
                      <span className="flex -space-x-1.5">
                        {d.muscles.map((m) => (
                          <span key={m} className="size-6 rounded-full ring-2 ring-background shadow-[inset_0_0_0_2px_rgb(0_0_0/0.25)]" style={{ background: PLATE[m].fill }} aria-hidden />
                        ))}
                      </span>
                      <span className="text-sm leading-tight font-bold">{d.muscles.map(muscleLabel).join(" + ")}</span>
                    </>
                  )}
                </div>

                <span className="text-[0.6875rem] leading-tight text-ink-subtle">
                  {done ? (
                    d.swapped && d.planned ? (
                      <>
                        <span className="font-bold text-ink">Completed</span> · <s>{d.planned.rest ? "Rest" : d.planned.muscles.map(muscleLabel).join(" + ")}</s>
                      </>
                    ) : (
                      <span className="font-bold text-ink">Completed</span>
                    )
                  ) : d.status === "rest-logged" ? (
                    d.swapped ? "Rested instead" : "Rested"
                  ) : d.status === "missed" ? (
                    "Not logged"
                  ) : (
                    d.note
                  )}
                </span>
              </motion.li>
            );
          })}
        </ol>
      </section>
    </MotionConfig>
  );
}
