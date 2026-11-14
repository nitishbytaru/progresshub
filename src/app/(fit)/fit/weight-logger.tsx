"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { CalendarDays, Dumbbell, Pencil } from "lucide-react";
import { Barbell, PlateFace } from "@/components/fit/barbell";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { WeightLog } from "@/lib/fit";
import { fromLocalDate, toLocalDate } from "@/lib/local-date";
import { MUSCLES, PLATE, UNIT_COOKIE, fmtWeight, fromKg, muscleLabel, unitRange, type Muscle, type Unit } from "@/lib/fit-units";
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
    setKgText("");
    rememberUnit(u);
  };
  const range = unitRange(unit);
  const byDay = useMemo(() => new Map(logs.map((l) => [l.day, l.kg])), [logs]);
  const gymDays = useMemo(() => logs.filter((l) => l.gym).map((l) => l.day), [logs]); // newest first
  const [kgText, setKgText] = useState("");
  const [day, setDayState] = useState(today);
  // Switching day starts a fresh entry.
  const setDay = (d: string) => {
    setDayState(d);
    setKgText("");
  };
  const [calendarOpen, setCalendarOpen] = useState(false);
  // The gym toggle follows the saved value for the picked day until the user flips it.
  const [gymPick, setGymPick] = useState<{ day: string; on: boolean } | null>(null);
  // Same for the trained muscles.
  const [musclePick, setMusclePick] = useState<{ day: string; list: Muscle[] } | null>(null);
  // The kg field is controlled so it only empties after a successful save (a failed one keeps what you typed);
  // the gym toggle then drops its unsaved override and shows what was just saved.
  const [state, action, pending] = useActionState<WeightState, FormData>(async (prev, formData) => {
    const result = await logWeight(prev, formData);
    if (result?.saved) {
      // A small physical "clank" where the device supports it.
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(18);
      setKgText("");
      setGymPick(null);
      setMusclePick(null);
    }
    return result;
  }, null);
  const formRef = useRef<HTMLDivElement>(null);
  const yesterday = addDays(today, -1);
  const current = byDay.get(day) ?? null;
  const gym = gymPick?.day === day ? gymPick.on : gymDays.includes(day);
  const savedMuscles = logs.find((l) => l.day === day)?.muscles ?? [];
  const muscles = musclePick?.day === day ? musclePick.list : savedMuscles;
  const toggleMuscle = (m: Muscle) =>
    setMusclePick({ day, list: muscles.includes(m) ? muscles.filter((x) => x !== m) : [...muscles, m] });
  // "Gym day N": every logged gym day before the picked day, plus this one.
  const earlierGym = gymDays.filter((d) => d < day);
  const gymNumber = gymBefore + earlierGym.length + 1;
  const lastGap = earlierGym[0] ? daysBetween(earlierGym[0], day) : null;
  const gymTotal = gymBefore + earlierGym.length;
  const dayLabel = day === today ? "Today" : day === yesterday ? "Yesterday" : `${weekday.format(utc(day))}, ${shortDate.format(utc(day))}`;
  const logged = week.filter((d) => byDay.has(d)).length;
  // This week's bar: saved gym days, with the picked day's plate following the form live.
  const barDays = week
    .filter((d) => d <= today)
    .flatMap((d) => {
      if (d === day) return gym ? [{ day: d, muscles: MUSCLES.filter((m) => muscles.includes(m)), kg: current }] : [];
      const l = logs.find((x) => x.day === d);
      return l?.gym ? [{ day: d, muscles: l.muscles, kg: l.kg }] : [];
    });
  const lastKg = logs[0]?.kg ?? null;

  // Picking a day from the strip or list scrolls the form into view on small screens.
  const pick = (d: string) => {
    setDay(d);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const chip = (active: boolean) =>
    `inline-flex h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors ${
      active ? "border-primary bg-primary-soft text-primary" : "border-outline text-ink-variant hover:bg-hover hover:text-ink"
    }`;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-start md:gap-6 lg:gap-10">
      <section ref={formRef} aria-label="Log a weight" className="scroll-mt-4 rounded-2xl border border-outline-variant bg-surface p-4 sm:p-5 md:col-span-7 lg:p-7">
        <form action={action} aria-busy={pending} className="flex flex-col gap-4">
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
            <label htmlFor="kg" className="flex items-baseline gap-2 text-xs font-bold tracking-[0.14em] uppercase">
              <span className="text-ink-subtle">{dayLabel}</span>
              {current !== null && <span className="font-display text-sm tracking-normal text-ink normal-case">logged {fmtWeight(current, unit)}</span>}
            </label>
            <div role="radiogroup" aria-label="Weight unit" className="flex h-11 rounded-full border border-outline p-1">
              {(["kg", "lb"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  role="radio"
                  aria-checked={unit === u}
                  onClick={() => setUnit(u)}
                  className={`min-w-12 rounded-full px-3 text-sm font-bold transition-colors ${
                    unit === u ? "bg-primary text-primary-foreground" : "text-ink-subtle hover:text-ink"
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
          <input type="hidden" name="unit" value={unit} />
          {/* Left empty on a logged day, the server keeps that day's weight and only updates gym. */}
          <input type="hidden" name="kg" value={kgText.trim()} />
          <div className={`-mt-2 flex h-20 items-center border-b-2 px-1 transition-colors focus-within:border-ink ${pending ? "border-ink/60 opacity-70" : "border-outline"}`}>
            <input
              id="kg"
              type="number"
              inputMode="decimal"
              step="0.1"
              min={range.min}
              max={range.max}
              required={current === null}
              value={kgText}
              onChange={(e) => setKgText(e.target.value)}
              aria-invalid={Boolean(state?.error)}
              aria-describedby="kg-status"
              readOnly={pending}
              className="w-full min-w-0 bg-transparent font-display text-6xl font-bold tracking-[-0.01em] text-ink outline-none"
              style={{ outline: "none" }}
            />
            <span className="flex flex-col items-end gap-0.5">
              <span className="font-display text-2xl font-semibold text-ink-subtle">{unit}</span>
              {current === null && lastKg !== null && !kgText && (
                <span className="text-[0.6875rem] font-semibold whitespace-nowrap text-ink-subtle">last {fmtWeight(lastKg, unit)}</span>
              )}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <input type="hidden" name="gym" value={gym ? "on" : "off"} />
            <button
              type="button"
              aria-pressed={gym}
              onClick={() => setGymPick({ day, on: !gym })}
              className={`inline-flex h-12 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors ${
                gym ? "border-ink bg-primary text-primary-foreground" : "border-outline text-ink-variant hover:bg-hover hover:text-ink"
              }`}
            >
              <Dumbbell className="size-4" aria-hidden />
              {gym ? "Went to gym" : "Gym?"}
            </button>
            <span
              className="text-right text-xs"
              aria-live="polite"
              title={gym ? `This is gym day ${gymNumber} in total` : undefined}
            >
              {gym ? (
                <>
                  <span className="text-ink-subtle">Gym day </span>
                  <span className="font-display text-4xl leading-none font-bold">{gymNumber}</span>
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

          {gym && (
            <fieldset className="-mt-1 flex flex-col gap-2">
              <legend className="mb-2 text-xs font-bold tracking-[0.14em] text-ink-subtle uppercase">Trained</legend>
              <div className="grid grid-cols-2 gap-2 min-[400px]:grid-cols-3">
                {MUSCLES.map((m) => {
                  const on = muscles.includes(m);
                  return (
                    <button
                      key={m}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleMuscle(m)}
                      className={`flex h-12 items-center gap-2 rounded-xl border px-2.5 text-sm font-semibold transition-[background-color,border-color,color] ${
                        on ? "border-transparent" : "border-outline text-ink-variant hover:bg-hover hover:text-ink"
                      }`}
                      style={on ? { background: PLATE[m].fill, color: PLATE[m].ink } : undefined}
                    >
                      <span
                        className="size-3 shrink-0 rounded-full ring-2 ring-black/25"
                        style={{ background: on ? PLATE[m].ink : PLATE[m].fill, opacity: on ? 0.9 : 1 }}
                        aria-hidden
                      />
                      {muscleLabel(m)}
                    </button>
                  );
                })}
              </div>
              {muscles.map((m) => (
                <input key={m} type="hidden" name="muscle" value={m} />
              ))}
            </fieldset>
          )}

          {/* This week's bar: the picked day's plate loads as you choose muscles, and clanks on when saved. */}
          <div className="border-y border-outline-variant px-1 py-4" aria-label={`This week: ${barDays.length} gym days loaded`} role="img">
            <Barbell
              key={state?.saved ? `${state.saved.day}-${state.saved.gym}-${state.saved.muscles.join()}` : "bar"}
              days={barDays}
              unit={unit}
              size="sm"
              animate={Boolean(state?.saved)}
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            aria-busy={pending}
            className={`relative inline-flex h-14 items-center justify-center gap-2.5 overflow-hidden rounded-full bg-primary text-base font-bold text-primary-foreground transition-[background-color,transform] hover:bg-primary-hover active:scale-[0.98] active:bg-primary-pressed disabled:cursor-progress ${
              pending ? "cursor-progress" : ""
            }`}
          >
            {pending ? (
              <>
                <span className="plate-loop flex items-center gap-[2px]" aria-hidden>
                  <span className="h-5 w-1.5 rounded-[2px] bg-plate-chest" />
                  <span className="h-5 w-1.5 rounded-[2px] bg-plate-back" />
                  <span className="h-5 w-1.5 rounded-[2px] bg-plate-legs" />
                </span>
                Saving…
              </>
            ) : current !== null ? (
              "Update"
            ) : day === today ? (
              "Log today"
            ) : (
              `Log ${dayLabel}`
            )}
          </button>
          <p id="kg-status" aria-live="polite" className="-mt-1 min-h-5 text-xs text-ink-variant">
            {state?.error ??
              (state?.saved
                ? `Saved ${fmtWeight(state.saved.kg, unit)} ${unit}${state.saved.gym ? ` + gym${state.saved.muscles.length ? ` (${state.saved.muscles.join(", ")})` : ""}` : ""} for ${shortDate.format(utc(state.saved.day))}.`
                : "")}
          </p>
        </form>
      </section>

      <section aria-label="Your last 7 days" className="divide-y divide-outline-variant rounded-2xl border border-outline-variant bg-surface md:sticky md:top-6 md:col-span-5">
        <div className="flex flex-col gap-3 p-5 sm:p-6">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold text-ink-variant">This week</span>
            <span className="font-display text-2xl font-bold">
              {logged}
              <span className="text-ink-subtle"> / 7 logged</span>
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
                    disabled={d > today}
                    aria-pressed={d === day}
                    aria-label={`${weekday.format(utc(d))} ${shortDate.format(utc(d))}: ${kg ? `${fmtWeight(kg, unit)} ${unit}${gymDays.includes(d) ? ", gym" : ""}, tap to edit` : "no entry, tap to log"}`}
                    className="flex w-full flex-col items-center gap-1.5 disabled:cursor-default"
                  >
                    <span
                      className={`relative aspect-square w-full rounded-lg transition-shadow ${
                        d > today ? "border border-dashed border-outline" : kg ? "bg-primary" : "bg-track"
                      } ${
                        d === day ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : ""
                      }`}
                    >
                      {gymDays.includes(d) && (
                        <Dumbbell className="absolute inset-0 m-auto size-3.5 text-primary-foreground" aria-hidden />
                      )}
                    </span>
                    <span className={`text-[0.6875rem] font-bold ${d === today ? "text-ink" : "text-ink-subtle"}`}>
                      {"MTWTFSS"[week.indexOf(d)]}
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
                      <span className="text-sm font-semibold text-ink-variant">
                        {l.day === today ? "Today" : shortDate.format(utc(l.day))}
                      </span>
                      <span className="flex items-center gap-3">
                        {diff !== null && diff !== 0 && (
                          <span className="font-display text-sm text-ink-subtle">
                            {diff > 0 ? "▲" : "▼"}
                            {Math.abs(diff).toFixed(1)}
                          </span>
                        )}
                        {l.gym && <PlateFace muscles={l.muscles} className="h-5 w-1.5" />}
                        <span className="font-display text-xl font-bold text-ink">{fmtWeight(l.kg, unit)}</span>
                        <Pencil className="size-3.5 text-ink-subtle transition-colors group-hover:text-ink" aria-hidden />
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
