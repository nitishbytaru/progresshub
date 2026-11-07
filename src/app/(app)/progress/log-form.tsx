"use client";

import { useId, useMemo, useState, useTransition } from "react";
import { CalendarDays, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { EntriesTable } from "@/components/progress/entries-table";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fmt, fmtDate, fmtDateShort, fmtPct, fmtSigned } from "@/lib/format";
import { addDays, forecast, GOAL, paceOver, toUTC, withDeltas, type Entry } from "@/lib/progress";
import { cn } from "@/lib/utils";
import { LIMITS, parseImpressions, validateEntry } from "@/lib/validation";
import { saveEntry } from "./actions";

// react-day-picker works in local time; logs are plain YYYY-MM-DD calendar days.
const toLocalDate = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day);
};
const fromLocalDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

type Props = { initialEntries: Entry[]; today: string; initialDate?: string };

export function LogForm({ initialEntries, today, initialDate }: Props) {
  // The last saved log is applied locally so the page updates instantly; fresh props replace it after revalidation.
  const [justSaved, setJustSaved] = useState<Entry | null>(null);
  const entries = useMemo(
    () => (justSaved ? [...initialEntries.filter((e) => e.date !== justSaved.date), justSaved] : initialEntries),
    [initialEntries, justSaved],
  );
  const yesterday = addDays(today, -1);
  const startDate =
    initialDate && toUTC(initialDate) <= toUTC(today) ? initialDate : today;
  const [date, setDate] = useState(startDate);
  const existing = entries.find((e) => e.date === date);
  // Exactly what the creator typed (digits only once it parses), so format mistakes can be explained.
  const [text, setText] = useState(existing ? String(existing.total) : "");
  const [saving, startSaving] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const inputId = useId();
  const [calendarOpen, setCalendarOpen] = useState(false);

  const pickDate = (d: string) => {
    setDate(d);
    const found = entries.find((e) => e.date === d);
    setText(found ? String(found.total) : "");
    setTouched(false);
    setServerError(null);
  };

  const parsed = parseImpressions(text);
  const value = parsed.value;
  const minDate = addDays(today, -LIMITS.maxBackfillDays);
  const sorted = useMemo(() => [...entries].sort((a, b) => toUTC(a.date) - toUTC(b.date)), [entries]);
  const before = [...sorted].reverse().find((e) => toUTC(e.date) < toUTC(date)) ?? null;
  const after = sorted.find((e) => toUTC(e.date) > toUTC(date)) ?? null;

  const error = parsed.error ?? validateEntry({ date, total: value, today, before, after });

  const preview = (() => {
    if (value === null || error) return null;
    const next = withDeltas([...entries.filter((e) => e.date !== date), { date, total: value }]);
    const row = next.find((r) => r.date === date)!;
    const last = next[next.length - 1];
    return { row, eta: forecast(last.total, paceOver(next, 7), last.date) };
  })();

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setServerError(null);
    if (error || value === null) return;
    startSaving(async () => {
      const result = await saveEntry(date, value);
      if (!result.ok) {
        setServerError(result.error);
        toast.error(result.error);
        return;
      }
      setJustSaved({ date, total: value });
      toast.success(`${result.created ? "Logged" : "Updated"} ${fmtDate(date)}: ${fmt(value)}`);
    });
  };

  const rows = useMemo(() => withDeltas(entries), [entries]);
  // Format and range problems show as you type; "enter a number" waits until you've tried.
  const showError = serverError ?? (value === null && !parsed.error ? (touched ? error : null) : error);

  const dateChoices = [
    { d: today, label: "Today", sub: fmtDateShort(today) },
    { d: yesterday, label: "Yesterday", sub: fmtDateShort(yesterday) },
  ];
  const isCustom = date !== today && date !== yesterday;

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
        <form onSubmit={save} noValidate className="panel-dark rounded-2xl p-5 sm:p-8">
          <h2 className="text-xl font-bold tracking-[-0.015em]">
            {existing ? `Update ${fmtDate(date)}` : "Log your impressions"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Copy the total from X analytics. We work out the daily gain.
          </p>

          <fieldset className="mt-7">
            <legend className="text-sm font-semibold">Day</legend>
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              {dateChoices.map(({ d, label, sub }) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => pickDate(d)}
                  aria-pressed={date === d}
                  className={cn(
                    "flex h-14 flex-col items-center justify-center rounded-lg border text-sm font-semibold transition-colors",
                    date === d
                      ? "border-primary bg-primary-soft text-foreground"
                      : "border-hairline hover:bg-hover",
                  )}
                >
                  {label}
                  <span className={cn("font-mono text-[11px] font-normal", date === d ? "text-primary" : "text-muted-foreground")}>
                    {sub}
                  </span>
                </button>
              ))}
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger
                  render={
                    <button
                      type="button"
                      aria-pressed={isCustom}
                      className={cn(
                        "flex h-14 w-full flex-col items-center justify-center rounded-lg border text-sm font-semibold transition-colors",
                        isCustom ? "border-primary bg-primary-soft text-foreground" : "border-hairline hover:bg-hover",
                      )}
                    />
                  }
                >
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="size-4" /> Other
                  </span>
                  <span className={cn("font-mono text-[11px] font-normal", isCustom ? "text-primary" : "text-muted-foreground")}>
                    {isCustom ? fmtDateShort(date) : "pick a day"}
                  </span>
                </PopoverTrigger>
                <PopoverContent align="end" sideOffset={8} className="w-auto p-2">
                  <Calendar
                    mode="single"
                    weekStartsOn={1}
                    selected={toLocalDate(date)}
                    defaultMonth={toLocalDate(date)}
                    disabled={[{ after: toLocalDate(today) }, { before: toLocalDate(minDate) }]}
                    startMonth={toLocalDate(minDate)}
                    endMonth={toLocalDate(today)}
                    modifiers={{ logged: entries.map((e) => toLocalDate(e.date)) }}
                    modifiersClassNames={{ logged: "[&>button]:after:absolute [&>button]:after:bottom-1 [&>button]:after:size-1 [&>button]:after:rounded-full [&>button]:after:bg-current [&>button]:after:opacity-60" }}
                    onSelect={(d) => {
                      if (!d) return;
                      pickDate(fromLocalDate(d));
                      setCalendarOpen(false);
                    }}
                  />
                  <p className="flex items-center gap-1.5 px-2 pt-1 pb-1 text-[11px] text-subtle">
                    <span className="size-1 rounded-full bg-muted-foreground" /> already logged
                  </p>
                </PopoverContent>
              </Popover>
            </div>
          </fieldset>

          <div className="mt-6">
            <label htmlFor={inputId} className="text-sm font-semibold">
              Total impressions
            </label>
            <div
              className={cn(
                "mt-2.5 flex h-16 items-center gap-3 rounded-xl border bg-surface-high px-4 transition-colors focus-within:border-foreground focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary",
                showError ? "border-foreground" : "border-hairline",
              )}
            >
              <input
                id={inputId}
                inputMode="numeric"
                autoComplete="off"
                placeholder={before ? `more than ${fmt(before.total)}` : "e.g. 157,400"}
                maxLength={24}
                value={/^\d+$/.test(text) ? fmt(Number(text)) : text}
                onChange={(e) => {
                  setServerError(null);
                  const typed = e.target.value;
                  const digits = typed.replace(/[\s,]/g, "");
                  // Clean digits are stored bare (and shown formatted); anything else is kept so its error can explain it.
                  setText(/^\d*$/.test(digits) ? digits.slice(0, LIMITS.maxDigits + 1) : typed);
                }}
                onBlur={() => setTouched(true)}
                aria-invalid={Boolean(showError)}
                aria-describedby={`${inputId}-msg`}
                className="w-full min-w-0 bg-transparent font-mono text-2xl font-semibold tracking-[-0.03em] text-foreground caret-primary outline-none placeholder:text-base placeholder:font-normal placeholder:tracking-normal placeholder:text-muted-foreground"
              />
              {existing && (
                <span className="shrink-0 rounded-full border border-hairline px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                  Logged
                </span>
              )}
            </div>
            <p id={`${inputId}-msg`} className={cn("mt-2 min-h-5 text-sm", showError ? "font-medium" : "text-muted-foreground")}>
              {showError ? showError : before ? `Previous log: ${fmt(before.total)} on ${fmtDateShort(before.date)}.` : "This is your first log."}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-3 divide-x divide-hairline rounded-xl border border-hairline">
            {[
              { label: "Daily gain", value: preview?.row.delta != null ? fmtSigned(preview.row.delta) : "—", key: true },
              { label: "Of 500K", value: preview ? fmtPct(preview.row.progressPct, 2) : "—" },
              { label: "500K around", value: preview?.eta ? fmtDateShort(preview.eta.etaDate) : "—" },
            ].map((s) => (
              <div key={s.label} className="p-3 sm:p-4">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="mt-1 font-mono text-base font-semibold tracking-[-0.02em] sm:text-lg">
                  {s.key && preview ? <span className="text-primary">{s.value}</span> : s.value}
                </p>
              </div>
            ))}
          </div>

          {preview && (
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-surface-highest" aria-hidden>
              <div
                className="h-full rounded-full bg-primary ring-1 ring-foreground/15 transition-[width] duration-500 ease-out"
                style={{ width: `${Math.min((preview.row.total / GOAL) * 100, 100)}%` }}
              />
            </div>
          )}

          <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {text !== (existing ? String(existing.total) : "") && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => pickDate(date)}
                className="h-12 px-5 text-sm font-semibold text-foreground hover:bg-hover"
              >
                Reset
              </Button>
            )}
            <Button
              type="submit"
              disabled={saving}
              className="h-12 gap-2 bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary-hover active:bg-primary-pressed"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" strokeWidth={2.5} />}
              {saving ? "Saving…" : existing ? "Update log" : "Save log"}
            </Button>
          </div>
        </form>

        <aside className="panel-dark flex flex-col gap-6 rounded-2xl p-5 sm:p-8">
          <div>
            <p className="font-mono text-[2.5rem] leading-none font-semibold tracking-[-0.04em] text-primary">
              {rows.length}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {rows.length ? `days logged since ${fmtDate(rows[0].date)}` : "days logged. Your first one starts the clock."}
            </p>
          </div>
          <div className="h-px bg-hairline" />
          <div>
            <h2 className="text-base font-semibold">Where to find the number</h2>
            <ol className="mt-3 flex list-decimal flex-col gap-2 pl-4 text-sm text-muted-foreground marker:font-mono marker:text-subtle">
              <li>Open X and go to Analytics.</li>
              <li>Set the range so it covers all your posts.</li>
              <li>Copy the total impressions and paste it here.</li>
            </ol>
          </div>
          <p className="mt-auto text-xs text-subtle">
            Log at the same time each day so daily gains compare fairly. Missed a day? Pick it with Other.
          </p>
        </aside>
      </div>

      {rows.length > 0 && (
      <section className="panel-dark rounded-2xl p-5 sm:p-8">
        <h2 className="text-xl font-bold tracking-[-0.015em]">History</h2>
        <p className="mt-0.5 mb-3 text-sm text-muted-foreground">Every log, newest first. Pick a day above to correct it.</p>
        <EntriesTable rows={rows} limit={rows.length} />
      </section>
      )}
    </div>
  );
}
