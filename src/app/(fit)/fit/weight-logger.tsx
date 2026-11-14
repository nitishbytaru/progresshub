"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { CalendarDays, Dumbbell, Pencil } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { WeightLog } from "@/lib/fit";
import { fromLocalDate, toLocalDate } from "@/lib/local-date";
import { UNIT_COOKIE, fmtWeight, fromKg, unitRange, type Unit } from "@/lib/fit-units";
import { logWeight, type WeightState } from "./actions";

const utc = (d: string) => new Date(`${d}T00:00:00Z`);
const shortDate = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" });
const weekday = new Intl.DateTimeFormat("en", { weekday: "short", timeZone: "UTC" });
const addDays = (d: string, n: number) => new Date(utc(d).getTime() + n * 86_400_000).toISOString().slice(0, 10);

type Props = { unit: Unit; today: string; minDay: string; logs: WeightLog[]; gymBefore: number; week: string[] };

const daysBetween = (a: string, b: string) => Math.round((utc(b).getTime() - utc(a).getTime()) / 86_400_000);

/** Remembers the unit for a year so the server renders it on the next visit. */
function rememberUnit(u: Unit) {
  document.cookie = `${UNIT_COOKIE}=${u}; path=/; max-age=31536000; samesite=lax`;
}

/** Pick a day (today, yesterday, any past day, or tap one in the strip/list) and log or correct its weight. */
export function WeightLogger({ unit: savedUnit, today, minDay, logs, gymBefore, week }: Props) {
  const [unit, setUnitState] = useState<Unit>(savedUnit);
  const setUnit = (u: Unit) => {
    setUnitState(u);
    rememberUnit(u);
  };
  const range = unitRange(unit);
  const byDay = useMemo(() => new Map(logs.map((l) => [l.day, l.kg])), [logs]);
  const gymDays = useMemo(() => logs.filter((l) => l.gym).map((l) => l.day), [logs]); // newest first
  const [day, setDay] = useState(today);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [state, action, pending] = useActionState<WeightState, FormData>(logWeight, null);
  const formRef = useRef<HTMLDivElement>(null);
  const yesterday = addDays(today, -1);
  const current = byDay.get(day) ?? null;
  // The gym toggle follows the saved value for the picked day until the user flips it.
  const [gymPick, setGymPick] = useState<{ day: string; on: boolean } | null>(null);
  const gym = gymPick?.day === day ? gymPick.on : gymDays.includes(day);
  // "Gym day N": every logged gym day before the picked day, plus this one.
  const earlierGym = gymDays.filter((d) => d < day);
  const gymNumber = gymBefore + earlierGym.length + 1;
  const lastGap = earlierGym[0] ? daysBetween(earlierGym[0], day) : null;
  const gymTotal = gymBefore + earlierGym.length;
  const dayLabel = day === today ? "Today" : day === yesterday ? "Yesterday" : `${weekday.format(utc(day))}, ${shortDate.format(utc(day))}`;
  const logged = week.filter((d) => byDay.has(d)).length;

  // Picking a day from the strip or list scrolls the form into view on small screens.
  const pick = (d: string) => {
    setDay(d);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const chip = (active: boolean) =>
    `inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors ${
      active ? "border-primary bg-primary-soft text-primary" : "border-outline text-ink-variant hover:bg-hover hover:text-ink"
    }`;

  return (
    <div className="flex flex-col gap-4">
      <section ref={formRef} aria-label="Log a weight" className="scroll-mt-4 rounded-3xl border border-outline-variant bg-surface p-5 sm:p-6">
        <form action={action} className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Day">
            <button type="button" className={chip(day === today)} aria-pressed={day === today} onClick={() => setDay(today)}>
              Today
            </button>
            <button type="button" className={chip(day === yesterday)} aria-pressed={day === yesterday} onClick={() => setDay(yesterday)}>
              Yesterday
            </button>
            <input type="hidden" name="day" value={day} />
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger
                className={chip(day !== today && day !== yesterday)}
                aria-label={`Pick a date${day !== today && day !== yesterday ? `, ${shortDate.format(utc(day))} selected` : ""}`}
              >
                <CalendarDays className="size-4" aria-hidden />
                {day !== today && day !== yesterday ? shortDate.format(utc(day)) : "Pick date"}
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-1">
                <Calendar
                  mode="single"
                  required
                  weekStartsOn={1}
                  today={toLocalDate(today)}
                  selected={toLocalDate(day)}
                  defaultMonth={toLocalDate(day)}
                  disabled={[{ after: toLocalDate(today) }, { before: toLocalDate(minDay) }]}
                  startMonth={toLocalDate(minDay)}
                  endMonth={toLocalDate(today)}
                  modifiers={{ logged: logs.map((l) => toLocalDate(l.day)) }}
                  modifiersClassNames={{
                    logged:
                      "[&>button]:after:absolute [&>button]:after:bottom-1 [&>button]:after:size-1 [&>button]:after:rounded-full [&>button]:after:bg-current [&>button]:after:opacity-60",
                  }}
                  className="bg-transparent [--cell-size:--spacing(10)]"
                  onSelect={(d) => {
                    if (!d) return;
                    setDay(fromLocalDate(d));
                    setCalendarOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center justify-between gap-3">
            <label htmlFor="kg" className="flex items-baseline gap-2 font-mono text-xs tracking-[0.04em] uppercase">
              <span className="text-ink-subtle">{dayLabel}</span>
              {current !== null && <span className="text-primary">logged {fmtWeight(current, unit)}</span>}
            </label>
            <div role="radiogroup" aria-label="Weight unit" className="flex h-8 rounded-full border border-outline p-0.5">
              {(["kg", "lb"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  role="radio"
                  aria-checked={unit === u}
                  onClick={() => setUnit(u)}
                  className={`min-w-11 rounded-full px-3 font-mono text-xs font-semibold transition-colors ${
                    unit === u ? "bg-primary text-primary-foreground" : "text-ink-subtle hover:text-ink"
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
          <input type="hidden" name="unit" value={unit} />
          <div className="-mt-2 flex h-20 items-center rounded-2xl border border-outline bg-background px-5 transition-colors focus-within:border-primary">
            <input
              key={`${day}-${unit}`}
              id="kg"
              name="kg"
              type="number"
              inputMode="decimal"
              step="0.1"
              min={range.min}
              max={range.max}
              required
              defaultValue={current === null ? undefined : fmtWeight(current, unit)}
              placeholder={unit === "lb" ? "160.0" : "72.4"}
              aria-invalid={Boolean(state?.error)}
              aria-describedby="kg-status"
              className="w-full min-w-0 bg-transparent font-mono text-4xl font-semibold tracking-[-0.04em] text-ink outline-none placeholder:text-track"
              style={{ outline: "none" }}
            />
            <span className="font-mono text-lg text-ink-subtle">{unit}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <input type="hidden" name="gym" value={gym ? "on" : "off"} />
            <button
              type="button"
              aria-pressed={gym}
              onClick={() => setGymPick({ day, on: !gym })}
              className={`inline-flex h-12 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors ${
                gym ? "border-primary bg-primary-soft text-primary" : "border-outline text-ink-variant hover:bg-hover hover:text-ink"
              }`}
            >
              <Dumbbell className="size-4" aria-hidden />
              {gym ? "Went to gym" : "Gym?"}
            </button>
            <span
              className="text-right font-mono text-xs tracking-[0.02em]"
              aria-live="polite"
              title={gym ? `This is gym day ${gymNumber} in total` : undefined}
            >
              {gym ? (
                <>
                  <span className="text-ink-subtle">Gym day </span>
                  <span className="text-2xl font-semibold tracking-[-0.03em] text-primary">{gymNumber}</span>
                </>
              ) : gymTotal > 0 && lastGap !== null ? (
                <span className="text-ink-subtle">
                  last gym {lastGap === 1 ? "1d" : `${lastGap}d`} ago · {gymTotal} total
                </span>
              ) : (
                <span className="text-ink-subtle">tap if you trained</span>
              )}
            </span>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="h-14 rounded-full bg-primary text-base font-bold text-primary-foreground transition-[background-color,transform] hover:bg-primary-hover active:scale-[0.98] active:bg-primary-pressed disabled:opacity-60"
          >
            {pending ? "Saving…" : current !== null ? "Update" : day === today ? "Log today" : `Log ${dayLabel}`}
          </button>
          <p id="kg-status" aria-live="polite" className="-mt-1 min-h-5 font-mono text-xs text-ink-variant">
            {state?.error ??
              (state?.saved
                ? `Saved ${fmtWeight(state.saved.kg, unit)} ${unit}${state.saved.gym ? " + gym" : ""} for ${shortDate.format(utc(state.saved.day))}.`
                : "")}
          </p>
        </form>
      </section>

      <section aria-label="Your last 7 days" className="divide-y divide-outline-variant rounded-3xl border border-outline-variant bg-surface">
        <div className="flex flex-col gap-3 p-5 sm:p-6">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold text-ink-variant">Logged</span>
            <span className="font-mono text-2xl font-semibold tracking-[-0.03em] text-primary">
              {logged}
              <span className="text-ink-subtle">/7</span>
            </span>
          </div>
          <ol className="grid grid-cols-7 gap-2">
            {week.map((d) => {
              const kg = byDay.get(d);
              return (
                <li key={d}>
                  <button
                    type="button"
                    onClick={() => pick(d)}
                    aria-pressed={d === day}
                    aria-label={`${weekday.format(utc(d))} ${shortDate.format(utc(d))}: ${kg ? `${fmtWeight(kg, unit)} ${unit}${gymDays.includes(d) ? ", gym" : ""}, tap to edit` : "no entry, tap to log"}`}
                    className="flex w-full flex-col items-center gap-1.5"
                  >
                    <span
                      className={`relative aspect-square w-full rounded-lg transition-shadow ${kg ? "bg-primary" : "bg-track"} ${
                        d === day ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : ""
                      }`}
                    >
                      {gymDays.includes(d) && (
                        <Dumbbell className="absolute inset-0 m-auto size-3.5 text-primary-foreground" aria-hidden />
                      )}
                    </span>
                    <span className={`font-mono text-[0.6875rem] ${d === today ? "text-ink" : "text-ink-subtle"}`}>
                      {weekday.format(utc(d)).charAt(0)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        {logs.length > 0 && (
          <div className="flex flex-col gap-1 p-3 sm:p-4">
            <span className="px-2 pt-1 pb-2 text-sm font-semibold text-ink-variant">Recent</span>
            <ul className="flex flex-col">
              {logs.slice(0, 7).map((l, i) => {
                const prev = logs[i + 1];
                const diff = prev ? Math.round((fromKg(l.kg, unit) - fromKg(prev.kg, unit)) * 10) / 10 : null;
                return (
                  <li key={l.day}>
                    <button
                      type="button"
                      onClick={() => pick(l.day)}
                      aria-label={`Edit ${shortDate.format(utc(l.day))}: ${fmtWeight(l.kg, unit)} ${unit}`}
                      className={`group flex h-12 w-full items-center justify-between rounded-xl px-2 transition-colors hover:bg-hover ${
                        l.day === day ? "bg-hover" : ""
                      }`}
                    >
                      <span className="font-mono text-sm text-ink-variant">
                        {l.day === today ? "Today" : shortDate.format(utc(l.day))}
                      </span>
                      <span className="flex items-center gap-3">
                        {diff !== null && diff !== 0 && (
                          <span className="font-mono text-xs text-ink-subtle">
                            {diff > 0 ? "▲" : "▼"}
                            {Math.abs(diff).toFixed(1)}
                          </span>
                        )}
                        {l.gym && <Dumbbell className="size-3.5 text-primary" aria-label="gym" />}
                        <span className="font-mono text-base font-semibold text-ink">{fmtWeight(l.kg, unit)}</span>
                        <Pencil className="size-3.5 text-ink-subtle transition-colors group-hover:text-primary" aria-hidden />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
