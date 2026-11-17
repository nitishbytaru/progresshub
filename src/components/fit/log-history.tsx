"use client";

import { useState, type CSSProperties } from "react";
import { Tri, goalDir, type GoalDir } from "./tri";
import { MotionConfig, motion } from "motion/react";
import { Pencil, Plus } from "lucide-react";
import { addDays, type FitLog } from "@/lib/fit-stats";
import { PLATE, fmtWeight, fromKg, muscleLabel, type Muscle, type Unit } from "@/lib/fit-units";
import { editDayInFlow } from "./log-flow";

const utc = (d: string) => new Date(`${d}T00:00:00Z`);
const shortDate = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", timeZone: "UTC" });
const weekday = new Intl.DateTimeFormat("en", { weekday: "short", timeZone: "UTC" });
const rim = "text-xs font-bold tracking-[0.14em] text-ink-variant uppercase";

/** A face-on bumper plate's colour: one slice per muscle trained, steel when none are tagged, rubber on rest days. */
function plateFill(l: FitLog): string {
  if (!l.gym) return "var(--track)";
  if (!l.muscles.length) return "var(--steel)";
  const n = l.muscles.length;
  return `conic-gradient(${l.muscles.map((m: Muscle, i) => `${PLATE[m].fill} ${(i / n) * 100}% ${((i + 1) / n) * 100}%`).join(", ")})`;
}

/** Consecutive logged days ending today (or yesterday, if today isn't logged yet). */
function dayStreak(has: (d: string) => boolean, today: string) {
  let d = has(today) ? today : addDays(today, -1);
  let n = 0;
  while (has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

/**
 * Beside the inline log flow: the week as a plate rack. Each logged day hangs a bumper plate on its peg
 * (sliced into the muscles trained, rubber on rest days) under a trace of the week's weigh-ins; empty
 * pegs wait to be logged. Tapping a day loads it into the flow to log or edit. The last seven weigh-ins follow.
 */
export function LogHistory({ logs, today, week, unit, goal = null }: { logs: FitLog[]; today: string; week: string[]; unit: Unit; goal?: string | null }) {
  const dir = goalDir(goal);
  const [picked, setPicked] = useState<string | null>(null);
  const byDay = new Map(logs.map((l) => [l.day, l]));
  const weekLogs = week.flatMap((d) => byDay.get(d) ?? []);
  const logged = weekLogs.length;
  const gym = weekLogs.filter((l) => l.gym).length;
  const streak = dayStreak((d) => byDay.has(d), today);

  // Change this week: latest weigh-in vs the last one before Monday (or the week's first).
  const before = logs.find((l) => l.day < week[0]);
  const base = before ?? weekLogs[0];
  const last = weekLogs.at(-1);
  const change = base && last && last !== base ? Math.round((fromKg(last.kg, unit) - fromKg(base.kg, unit)) * 10) / 10 : null;

  // The trace: weigh-ins placed in their day column, scaled to the week's own range.
  const kgs = weekLogs.map((l) => l.kg);
  const lo = Math.min(...kgs);
  const span = Math.max(Math.max(...kgs) - lo, 0.4);
  const pts = week.flatMap((d, i) => {
    const l = byDay.get(d);
    return l ? [{ i, d, x: ((i + 0.5) / 7) * 100, y: 74 - ((l.kg - lo) / span) * 58 }] : [];
  });

  const pick = (d: string) => {
    setPicked(d);
    editDayInFlow(d);
  };

  return (
    <MotionConfig reducedMotion="user">
      <section aria-label="This week" className="card-in divide-y divide-outline-variant rounded-2xl border border-outline-variant bg-surface md:sticky md:top-6" style={{ ["--card-i" as string]: 1 }}>
        <div className="flex flex-col gap-5 p-5 sm:p-6">
          <div className="flex items-baseline justify-between">
            <span className={rim}>This week</span>
            <span className="font-display text-4xl leading-none font-bold tabular-nums" aria-label={`${logged} of 7 days logged`}>
              {logged}
              <span className="text-xl text-ink-subtle">/7</span>
            </span>
          </div>

          {/* Label + number: three quick reads instead of sentences. */}
          <dl className="grid grid-cols-3 divide-x divide-outline-variant rounded-xl border border-outline-variant">
            <Stat label="Gym" value={String(gym)} tag="days" />
            <Stat
              label="Change"
              value={change === null ? "–" : change === 0 ? "0.0" : (
                <>
                  <Tri d={change} dir={dir} />
                  {Math.abs(change).toFixed(1)}
                </>
              )}
              tag={unit}
              title={change === null ? "Not enough weigh-ins yet" : `${change > 0 ? "Up" : change < 0 ? "Down" : "No change"} ${Math.abs(change).toFixed(1)} ${unit} this week`}
            />
            <Stat label="Streak" value={String(streak)} tag={streak === 1 ? "day" : "days"} title={`${streak} days logged in a row`} />
          </dl>

          {/* The rack: weigh-in trace above, one peg per day, plates hanging on the logged ones. */}
          <div className="relative">
            <div className="relative h-14" role="img" aria-label={pts.length > 1 ? `Weigh-ins this week from ${fmtWeight(weekLogs[0].kg, unit)} to ${fmtWeight(last!.kg, unit)} ${unit}` : "Weigh-in trace appears after two weigh-ins"}>
              {pts.length > 1 && (
                <motion.svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  className="absolute inset-0 size-full overflow-visible"
                  initial={{ clipPath: "inset(-10% 100% -10% 0)" }}
                  animate={{ clipPath: "inset(-10% 0% -10% 0)" }}
                  transition={{ duration: 1.1, delay: 0.35, ease: [0.2, 0.9, 0.25, 1] }}
                  aria-hidden
                >
                  <polyline
                    points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="none"
                    stroke="var(--chalk-variant)"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </motion.svg>
              )}
              {pts.map((p) => (
                <motion.span
                  key={p.d}
                  className={`absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ${p.d === picked ? "bg-ink" : "bg-ink-variant"}`}
                  style={{ left: `${p.x}%`, top: `${p.y}%` }}
                  initial={{ scale: 0 }}
                  animate={{ scale: p.d === picked ? 1.6 : 1 }}
                  transition={{ type: "spring", stiffness: 420, damping: 18, delay: p.d === picked ? 0 : 0.35 + p.i * 0.12 }}
                  aria-hidden
                />
              ))}
            </div>

            <ol className="relative grid grid-cols-7">
              {/* Rack rail the pegs hang from. */}
              <span className="absolute inset-x-1 top-0 h-1 rounded-full bg-steel/70" aria-hidden />
              {week.map((d, i) => {
                const l = byDay.get(d);
                const future = d > today;
                const on = d === picked;
                const name = `${weekday.format(utc(d))} ${shortDate.format(utc(d))}`;
                const what = l ? `${fmtWeight(l.kg, unit)} ${unit}, ${l.gym ? (l.muscles.length ? l.muscles.map(muscleLabel).join(", ") : "gym") : "rest day"}, tap to edit` : "no entry, tap to log";
                return (
                  <li key={d} className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => pick(d)}
                      disabled={future}
                      aria-pressed={on}
                      aria-label={`${name}: ${future ? "coming up" : what}`}
                      title={future ? undefined : `${name}: ${what}`}
                      className="group flex w-full flex-col items-center rounded-xl pb-1 outline-offset-2 disabled:cursor-default"
                    >
                      {/* Peg */}
                      <span className={`h-3 w-1 rounded-b-sm ${future ? "bg-outline-variant" : "bg-steel"}`} aria-hidden />
                      <motion.span
                        className="relative -mt-1 grid aspect-square w-[78%] max-w-12 place-items-center"
                        animate={{ y: on ? -6 : 0 }}
                        transition={{ type: "spring", stiffness: 380, damping: 20 }}
                        aria-hidden
                      >
                        {l ? (
                          <span
                            className="plate-roll relative grid size-full place-items-center rounded-full shadow-[inset_0_0_0_3px_rgb(0_0_0/0.3)] transition-transform duration-500 group-hover:rotate-45"
                            style={{ background: plateFill(l), "--i": i } as CSSProperties}
                          >
                            {!l.gym && <span className="absolute inset-[3px] rounded-full border border-steel/60" />}
                            <span className="absolute top-[9%] h-[14%] w-[9%] rounded-full bg-black/30" />
                            <span className="size-[34%] rounded-full bg-surface shadow-[0_0_0_2px_rgb(0_0_0/0.3)]" />
                          </span>
                        ) : future ? (
                          <span className="size-full rounded-full border border-dashed border-outline-variant" />
                        ) : (
                          <span className="grid size-full place-items-center rounded-full border border-dashed border-outline text-ink-subtle transition-colors group-hover:border-ink group-hover:text-ink">
                            <Plus className="size-4" />
                          </span>
                        )}
                        {on && <motion.span layoutId="rack-pick" className="absolute -inset-1 rounded-full ring-2 ring-ink" transition={{ type: "spring", stiffness: 420, damping: 30 }} />}
                      </motion.span>
                      <span className={`mt-2 font-display text-[0.8125rem] leading-none font-bold tabular-nums ${l ? "text-ink" : "text-transparent"}`} aria-hidden>
                        {l ? fmtWeight(l.kg, unit) : "·"}
                      </span>
                      <span className={`mt-1.5 text-[0.6875rem] font-bold ${d === today ? "text-ink" : "text-ink-subtle"}`} aria-hidden>
                        {"MTWTFSS"[i]}
                      </span>
                      <span className={`mt-1 h-0.5 w-3 rounded-full ${d === today ? "bg-ink" : "bg-transparent"}`} aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        {logs.length > 0 && <RecentLadder dir={dir} logs={logs.slice(0, 7)} older={logs[7]} today={today} unit={unit} picked={picked} onPick={pick} />}
      </section>
    </MotionConfig>
  );
}

function Stat({ label, value, tag, title }: { label: string; value: React.ReactNode; tag: string; title?: string }) {
  return (
    <div className="flex flex-col gap-1 px-3 py-2.5" title={title}>
      <dt className="text-[0.6875rem] font-bold tracking-[0.12em] text-ink-subtle uppercase">{label}</dt>
      <dd className="flex items-baseline gap-1">
        <span className="font-display text-2xl leading-none font-bold tabular-nums">{value}</span>
        <span className="text-[0.6875rem] font-semibold text-ink-subtle">{tag}</span>
      </dd>
    </div>
  );
}

const dayNum = new Intl.DateTimeFormat("en", { day: "numeric", timeZone: "UTC" });

/**
 * The last seven weigh-ins as a ladder: a date block, then a mini plate set left-to-right by weight
 * (lighter left, heavier right) with a line down to the next row, so the rows read as a trend.
 * Rows slide in one after another, the links wipe down, the picked row gets a gliding chalk highlight.
 */
function RecentLadder({ logs, older, today, unit, picked, onPick, dir }: { logs: FitLog[]; older?: FitLog; today: string; unit: Unit; picked: string | null; onPick: (d: string) => void; dir: GoalDir }) {
  const kgs = logs.map((l) => l.kg);
  const lo = Math.min(...kgs);
  const hi = Math.max(...kgs);
  const span = Math.max(hi - lo, 0.4);
  const x = (kg: number) => 10 + ((kg - lo) / span) * 80;

  return (
    <div className="flex flex-col gap-2 p-3 sm:p-4">
      <div className="flex items-baseline justify-between px-2 pt-1">
        <span className={rim}>Recent</span>
        <span className="font-display text-xs font-semibold text-ink-subtle tabular-nums" title="Range of your last seven weigh-ins">
          {fmtWeight(lo, unit)}–{fmtWeight(hi, unit)} {unit}
        </span>
      </div>
      <ul className="flex flex-col">
        {logs.map((l, i) => {
          const prev = logs[i + 1] ?? older;
          const next = logs[i + 1];
          const diff = prev ? Math.round((fromKg(l.kg, unit) - fromKg(prev.kg, unit)) * 10) / 10 : null;
          const on = l.day === picked;
          const isToday = l.day === today;
          return (
            <motion.li key={l.day} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, delay: 0.15 + i * 0.06, ease: [0.2, 0.9, 0.25, 1] }}>
              <button
                type="button"
                onClick={() => onPick(l.day)}
                aria-label={`Edit ${isToday ? "today" : shortDate.format(utc(l.day))}: ${fmtWeight(l.kg, unit)} ${unit}${diff ? `, ${diff > 0 ? "up" : "down"} ${Math.abs(diff).toFixed(1)}` : ""}${l.gym ? (l.muscles.length ? `, ${l.muscles.map(muscleLabel).join(", ")}` : ", gym") : ", rest day"}`}
                className="group relative grid h-14 w-full grid-cols-[2.75rem_1fr_auto] items-center gap-3 rounded-xl px-2 text-left outline-offset-2"
              >
                {on && <motion.span layoutId="recent-pick" className="absolute inset-0 rounded-xl border border-outline bg-hover" transition={{ type: "spring", stiffness: 420, damping: 34 }} aria-hidden />}
                <span className="absolute inset-0 rounded-xl transition-colors group-hover:bg-hover" aria-hidden />

                {/* Date block */}
                <span className="relative flex flex-col items-start leading-none">
                  <span className="font-display text-2xl font-bold tabular-nums">{dayNum.format(utc(l.day))}</span>
                  <span className={`mt-0.5 text-[0.625rem] font-bold tracking-[0.12em] uppercase ${isToday ? "text-ink" : "text-ink-subtle"}`}>{isToday ? "Today" : weekday.format(utc(l.day))}</span>
                </span>

                {/* Ladder: plate placed by weight, linked to the row below. */}
                <span className="relative h-full" aria-hidden>
                  <span className="absolute inset-x-0 top-1/2 border-t border-dotted border-outline-variant" />
                  {next && (
                    <motion.svg
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                      className="absolute inset-x-0 top-1/2 h-full w-full overflow-visible"
                      initial={{ clipPath: "inset(0 0 100% 0)" }}
                      animate={{ clipPath: "inset(0 0 0% 0)" }}
                      transition={{ duration: 0.35, delay: 0.45 + i * 0.08, ease: "easeOut" }}
                    >
                      <line x1={x(l.kg)} y1={0} x2={x(next.kg)} y2={100} stroke="var(--chalk-subtle)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
                    </motion.svg>
                  )}
                  <motion.span
                    className={`absolute top-1/2 grid size-4 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full shadow-[inset_0_0_0_2px_rgb(0_0_0/0.3)] transition-transform duration-500 group-hover:rotate-90 ${l.gym ? "" : "border border-steel/70"} ${isToday || on ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : ""}`}
                    style={{ left: `${x(l.kg)}%`, background: plateFill(l) }}
                    initial={{ scale: 0 }}
                    animate={{ scale: on ? 1.25 : 1 }}
                    transition={{ type: "spring", stiffness: 420, damping: 16, delay: on ? 0 : 0.3 + i * 0.07 }}
                  >
                    <span className="size-1.5 rounded-full bg-surface" />
                  </motion.span>
                </span>

                {/* Change + weight */}
                <span className="relative flex items-center gap-2.5">
                  <span className={`w-12 rounded-full border px-1.5 py-0.5 text-center font-display text-xs font-semibold tabular-nums ${diff ? "border-outline-variant text-ink-variant" : "border-transparent text-ink-subtle"}`}>
                    {diff === null ? "" : diff === 0 ? "0.0" : (
                      <>
                        <Tri d={diff} dir={dir} />
                        {Math.abs(diff).toFixed(1)}
                      </>
                    )}
                  </span>
                  <span className="w-12 text-right font-display text-xl font-bold tabular-nums transition-transform group-hover:-translate-x-0.5">{fmtWeight(l.kg, unit)}</span>
                  <Pencil className="size-3.5 text-ink-subtle transition-all group-hover:text-ink sm:opacity-0 sm:group-hover:opacity-100" aria-hidden />
                </span>
              </button>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
