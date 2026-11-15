"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fromLocalDate, toLocalDate } from "@/lib/local-date";

const utc = (d: string) => new Date(`${d}T00:00:00Z`);
const addDays = (d: string, n: number) => new Date(utc(d).getTime() + n * 86_400_000).toISOString().slice(0, 10);
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const label = (d: string) => `${WD[utc(d).getUTCDay()]}, ${MONTHS[utc(d).getUTCMonth()]} ${utc(d).getUTCDate()}`;
const href = (d: string, today: string) => (d === today ? "/food" : `/food?day=${d}`);

const R = 17;
const CIRC = 2 * Math.PI * R;

/**
 * Week picker: Mon–Sun as calorie rings (each fills toward the target, dashed when over), the picked
 * day as a chalk disc that glides between days, today dotted. Arrows or a swipe change week; the date
 * button opens a calendar for any older day.
 */
export function DayStrip({
  week,
  day,
  today,
  minDay,
  target,
  logged,
}: {
  /** The seven days (Mon–Sun) of the picked day's week, with calories eaten. */
  week: { day: string; kcal: number }[];
  day: string;
  today: string;
  minDay: string;
  target: number | null;
  /** Days with any food, for the calendar dots. */
  logged: string[];
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [calOpen, setCalOpen] = useState(false);
  const uid = useId();
  const [dir, setDir] = useState(0);
  const prevWeek = addDays(day, -7) < minDay ? null : addDays(day, -7);
  const nextWeek = week[0].day > addDays(today, -7) ? null : addDays(day, 7) > today ? today : addDays(day, 7);
  const go = (d: string | null, direction: number) => {
    if (!d) return;
    setDir(direction);
    router.push(href(d, today), { scroll: false });
  };
  const max = target ?? Math.max(1, ...week.map((w) => w.kcal));

  return (
    <nav aria-label="Pick a day" className="card-in flex flex-col gap-3 rounded-2xl border border-outline-variant bg-surface p-3 sm:p-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => go(prevWeek, -1)}
          disabled={!prevWeek}
          aria-label="Previous week"
          className="grid size-10 shrink-0 place-items-center rounded-full text-ink-variant hover:bg-hover hover:text-ink disabled:opacity-30"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>

        <Popover open={calOpen} onOpenChange={setCalOpen}>
          <PopoverTrigger className="mx-auto inline-flex h-10 min-w-0 items-center gap-2 rounded-full px-3 hover:bg-hover">
            <CalendarDays className="size-4 shrink-0 text-ink-subtle" aria-hidden />
            <span className="truncate font-display text-xl font-bold uppercase">
              {day === today ? (
                <>
                  Today <span className="text-ink-subtle">· {label(day)}</span>
                </>
              ) : (
                label(day)
              )}
            </span>
          </PopoverTrigger>
          <PopoverContent align="center" className="w-auto p-1">
            <Calendar
              mode="single"
              required
              weekStartsOn={1}
              today={toLocalDate(today)}
              selected={toLocalDate(day)}
              defaultMonth={toLocalDate(day)}
              disabled={[{ after: toLocalDate(today) }, { before: toLocalDate(minDay) }]}
              modifiers={{ logged: logged.map(toLocalDate) }}
              modifiersClassNames={{
                logged: "[&>button]:after:absolute [&>button]:after:bottom-1 [&>button]:after:size-1 [&>button]:after:rounded-full [&>button]:after:bg-current",
              }}
              className="bg-transparent [--cell-size:--spacing(10)]"
              onSelect={(d) => {
                if (!d) return;
                const picked = fromLocalDate(d);
                setDir(picked < day ? -1 : 1);
                setCalOpen(false);
                router.push(href(picked, today), { scroll: false });
              }}
            />
          </PopoverContent>
        </Popover>

        {day !== today ? (
          <Link href="/food" scroll={false} onClick={() => setDir(1)} className="h-8 shrink-0 rounded-full border border-outline px-3 text-xs leading-8 font-bold text-ink-variant hover:bg-hover hover:text-ink">
            Today
          </Link>
        ) : null}
        <button
          type="button"
          onClick={() => go(nextWeek, 1)}
          disabled={!nextWeek}
          aria-label="Next week"
          className="grid size-10 shrink-0 place-items-center rounded-full text-ink-variant hover:bg-hover hover:text-ink disabled:opacity-30"
        >
          <ChevronRight className="size-5" aria-hidden />
        </button>
      </div>

      {/* The week: swipe to change week. */}
      <div className="relative overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.ol
            key={week[0].day}
            custom={dir}
            className="grid touch-pan-y grid-cols-7 gap-1"
            initial={reduce ? false : { x: dir * 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={reduce ? undefined : { x: dir * -60, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.2, 0.9, 0.25, 1] }}
            drag={reduce ? false : "x"}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            onDragEnd={(_, info) => {
              if (info.offset.x > 60) go(prevWeek, -1);
              else if (info.offset.x < -60) go(nextWeek, 1);
            }}
          >
            {week.map((w) => {
              const on = w.day === day;
              const future = w.day > today || w.day < minDay;
              const pct = w.kcal / max;
              const over = target !== null && w.kcal > target * 1.1;
              const date = utc(w.day);
              const body = (
                <>
                  <span className={`text-[0.6875rem] font-bold tracking-wide ${on ? "text-ink" : "text-ink-subtle"}`}>{WD[date.getUTCDay()].slice(0, 1)}</span>
                  <span className="relative grid size-11 place-items-center sm:size-12">
                    <svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90" aria-hidden>
                      <circle cx="22" cy="22" r={R} fill="none" stroke="var(--track)" strokeWidth="4" />
                      {w.kcal > 0 && (
                        <motion.circle
                          cx="22"
                          cy="22"
                          r={R}
                          fill="none"
                          stroke="var(--macro-kcal)"
                          strokeWidth="4"
                          strokeLinecap={over ? "butt" : "round"}
                          strokeDasharray={over ? "3 2.4" : `${CIRC} ${CIRC}`}
                          initial={{ strokeDashoffset: over ? 0 : CIRC }}
                          animate={{ strokeDashoffset: over ? 0 : CIRC * (1 - Math.min(1, pct)) }}
                          transition={{ type: "spring", stiffness: 120, damping: 20 }}
                        />
                      )}
                    </svg>
                    {on && <motion.span layoutId={`day-disc-${uid}`} className="absolute inset-[5px] rounded-full bg-primary" transition={{ type: "spring", stiffness: 420, damping: 32 }} />}
                    <span className={`relative font-display text-base font-bold tabular-nums ${on ? "text-primary-foreground" : future ? "text-ink-subtle" : "text-ink"}`}>{date.getUTCDate()}</span>
                  </span>
                  <span className={`size-1 rounded-full ${w.day === today ? "bg-ink" : "bg-transparent"}`} aria-hidden />
                </>
              );
              const cls = "flex flex-col items-center gap-1 rounded-xl py-1.5";
              return (
                <li key={w.day}>
                  {future ? (
                    <span className={`${cls} opacity-35`} aria-disabled>
                      {body}
                    </span>
                  ) : (
                    <Link
                      href={href(w.day, today)}
                      scroll={false}
                      onClick={() => setDir(w.day < day ? -1 : 1)}
                      aria-current={on ? "date" : undefined}
                      aria-label={`${label(w.day)}: ${Math.round(w.kcal)} kcal${target ? ` of ${target}` : ""}`}
                      className={`${cls} transition-colors hover:bg-hover`}
                      draggable={false}
                    >
                      {body}
                    </Link>
                  )}
                </li>
              );
            })}
          </motion.ol>
        </AnimatePresence>
      </div>
    </nav>
  );
}
