"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { InView } from "@/components/progress/in-view";
import type { FitStats } from "@/lib/fit-stats";
import {
  MUSCLES,
  PLATE,
  muscleLabel,
  type Muscle,
  type Unit,
} from "@/lib/fit-units";
import { Barbell } from "./barbell";

/**
 * This week's loaded bar, the 30-day muscle split and the weekly stacks, sharing one highlight:
 * tap a muscle group and every plate that trained it stays lit while the rest fade.
 */
export function TrainingBoard({
  s,
  unit,
  today,
  weight,
  after,
}: {
  s: FitStats;
  unit: Unit;
  today: string;
  weight: ReactNode;
  after?: ReactNode;
}) {
  const [highlight, setHighlight] = useState<Muscle | null>(null);
  const loaded = s.gymWeek
    .filter((d) => d.gym)
    .map((d) => ({ day: d.day, muscles: d.muscles, kg: d.kg }));
  const trained = s.muscles.some((m) => m.lastDay);
  // Due: every group never trained; if all have been, the one that has waited longest.
  const longest = Math.max(...s.muscles.map((m) => m.daysAgo ?? -1));
  const due = new Set(
    trained
      ? s.muscles.some((m) => m.daysAgo === null)
        ? s.muscles.filter((m) => m.daysAgo === null).map((m) => m.muscle)
        : s.muscles.filter((m) => m.daysAgo === longest).map((m) => m.muscle)
      : [],
  );

  return (
    <>
      {/* The week, loaded. */}
      <InView
        aria-label="This week's training"
        className="card-in pt-2 md:col-span-12 lg:col-span-8"
      >
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs font-bold tracking-[0.14em] text-ink-variant uppercase">
            This week
          </h2>
          <p className="font-display text-xl font-bold">
            {s.gymWeekCount}
            <span className="text-ink-subtle"> / 7 loaded</span>
          </p>
        </div>
        <div className="mt-4">
          {loaded.length ? (
            <Barbell days={loaded} unit={unit} highlight={highlight} />
          ) : (
            <div className="relative">
              <Barbell days={[]} unit={unit} />
              <Link
                href="/log"
                className="absolute inset-0 m-auto inline-flex h-11 w-fit items-center gap-1.5 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                <Plus className="size-4" aria-hidden /> Load the first plate
              </Link>
            </div>
          )}
        </div>
        <ol
          className="mt-3 grid grid-cols-7 gap-1"
          aria-label="Gym days this week"
        >
          {s.gymWeek.map((d, i) => (
            <li key={d.day} className="flex flex-col items-center gap-1.5">
              <span
                className={`h-1.5 w-full rounded-full ${d.gym === null ? "bg-transparent outline-1 outline-dashed outline-outline" : d.gym ? "bg-ink" : "bg-track"}`}
              />
              <span
                className={`text-[0.6875rem] font-bold ${d.day === today ? "text-ink" : "text-ink-subtle"}`}
              >
                {"MTWTFSS"[i]}
              </span>
            </li>
          ))}
        </ol>
      </InView>

      <div className="md:col-span-12 lg:col-span-4 lg:self-center">
        {weight}
      </div>

      {after}

      {/* 30-day split: one plate face per group, tap to trace it. */}
      <InView
        aria-label="Muscle split, last 30 days"
        className="card-in rounded-2xl border border-outline-variant bg-surface p-4 sm:p-5 md:col-span-12 lg:p-6"
        style={{ ["--card-i" as string]: 2 }}
      >
        <div className="flex items-baseline justify-between pb-3">
          <h2 className="text-xs font-bold tracking-[0.14em] text-ink-variant uppercase">
            Split · 30 days
          </h2>
          {highlight && (
            <button
              type="button"
              onClick={() => setHighlight(null)}
              className="text-xs font-semibold text-ink-subtle underline-offset-4 hover:text-ink hover:underline"
            >
              Show all
            </button>
          )}
        </div>
        {!trained ? (
          <p className="py-2 text-sm text-ink-subtle">
            Tag muscles when you log a gym day to see your split.
          </p>
        ) : (
          <ul className="grid grid-cols-3 gap-2">
            {MUSCLES.map((m) => {
              const stat = s.muscles.find((x) => x.muscle === m)!;
              const on = highlight === m;
              return (
                <li key={m}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => setHighlight(on ? null : m)}
                    aria-label={`${muscleLabel(m)}: ${stat.count30} sessions in 30 days, ${stat.daysAgo === null ? "never trained" : `last ${stat.daysAgo} days ago`}${due.has(m) ? ", due (longest since trained)" : ""}. Tap to highlight.`}
                    className={`group flex w-full flex-col items-start gap-2 rounded-xl p-2 text-left transition-opacity ${
                      highlight && !on ? "opacity-45" : ""
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={`grid size-12 place-items-center rounded-full font-display text-2xl font-bold outline-offset-[3px] ${stat.count30 ? "ring-4 ring-black/30 ring-inset" : ""} transition-[outline-color] group-hover:outline-2 group-hover:outline-ink-subtle ${
                          on
                            ? "outline-2 outline-ink group-hover:outline-ink"
                            : "outline-transparent"
                        }`}
                        // Zero sessions: an empty plate ring in the group colour, number still readable.
                        style={
                          stat.count30
                            ? { background: PLATE[m].fill, color: PLATE[m].ink }
                            : { boxShadow: `inset 0 0 0 3px ${PLATE[m].fill}`, color: "var(--chalk-variant)" }
                        }
                      >
                        {stat.count30}
                      </span>
                      {due.has(m) && (
                        <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[0.6875rem] font-bold text-ink">
                          due
                        </span>
                      )}
                    </span>
                    <span className="text-sm font-semibold">
                      {muscleLabel(m)}
                    </span>
                    <span className="-mt-1.5 text-xs text-ink-subtle">
                      {stat.daysAgo === null
                        ? "never"
                        : stat.daysAgo === 0
                          ? "today"
                          : `${stat.daysAgo}d ago`}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </InView>
    </>
  );
}
