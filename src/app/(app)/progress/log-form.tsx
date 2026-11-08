"use client";

import { useId, useMemo, useState, useTransition } from "react";
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { EntriesTable } from "@/components/progress/entries-table";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { fmt, fmtCompact, fmtDate, fmtDateShort, fmtPct, fmtSigned } from "@/lib/format";
import { addDays, forecast, GOAL, MILESTONE_STEP, milestoneCrossed, paceOver, toUTC, withDeltas, type Entry } from "@/lib/progress";
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

const PAGE_SIZE = 10;

type Props = { initialEntries: Entry[]; today: string; initialDate?: string };

export function LogForm({ initialEntries, today, initialDate }: Props) {
  // The last saved log is applied locally so the page updates instantly; fresh props replace it after revalidation.
  const [justSaved, setJustSaved] = useState<Entry | null>(null);
  const router = useRouter();
  const entries = useMemo(
    () => (justSaved ? [...initialEntries.filter((e) => e.date !== justSaved.date), justSaved] : initialEntries),
    [initialEntries, justSaved],
  );
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
  const [month, setMonth] = useState(() => toLocalDate(startDate));

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
      // Highest total before vs after this save: crossing a 25K mark is a milestone.
      const bestBefore = Math.max(0, ...entries.filter((e) => e.date !== date).map((e) => e.total));
      const crossed = milestoneCrossed(bestBefore, Math.max(bestBefore, value));
      setJustSaved({ date, total: value });
      if (crossed) {
        toast.success(`Milestone: ${fmtCompact(crossed)} impressions!`, {
          description: `${crossed >= GOAL ? "You reached 500K." : `Next stop: ${fmtCompact(crossed + MILESTONE_STEP)}.`} Share it on X.`,
          action: { label: "Share", onClick: () => router.push("/share") },
          duration: 8000,
        });
      } else {
        toast.success(`${result.created ? "Logged" : "Updated"} ${fmtDate(date)}: ${fmt(value)}`);
      }
    });
  };

  const rows = useMemo(() => withDeltas(entries), [entries]);
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const [pageState, setPage] = useState(0);
  const page = Math.min(pageState, pageCount - 1);
  const first = page * PAGE_SIZE;
  // Format and range problems show as you type; "enter a number" waits until you've tried.
  const showError = serverError ?? (value === null && !parsed.error ? (touched ? error : null) : error);

  const dayLabel = date === today ? `today, ${fmtDateShort(date)}` : fmtDate(date);

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <form
        onSubmit={save}
        noValidate
        aria-label={existing ? `Update ${fmtDate(date)}` : "Log your impressions"}
        className="panel-dark rounded-2xl p-5 sm:p-8"
      >
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-10">
          <div role="group" aria-labelledby={`${inputId}-day`} className="lg:order-last lg:border-l lg:border-hairline lg:pl-10">
            <div className="flex min-h-7 items-center justify-between gap-3">
              <p id={`${inputId}-day`} className="text-sm font-semibold">Day</p>
              {date !== today && (
                <button
                  type="button"
                  onClick={() => {
                    pickDate(today);
                    setMonth(toLocalDate(today));
                  }}
                  className="rounded-md px-2 py-1 text-xs font-semibold text-primary transition-colors hover:bg-hover"
                >
                  Back to today
                </button>
              )}
            </div>
            <Calendar
              mode="single"
              required
              weekStartsOn={1}
              today={toLocalDate(today)}
              selected={toLocalDate(date)}
              month={month}
              onMonthChange={setMonth}
              disabled={[{ after: toLocalDate(today) }, { before: toLocalDate(minDate) }]}
              startMonth={toLocalDate(minDate)}
              endMonth={toLocalDate(today)}
              modifiers={{ logged: entries.map((e) => toLocalDate(e.date)) }}
              modifiersClassNames={{ logged: "[&>button]:after:absolute [&>button]:after:bottom-1 [&>button]:after:size-1 [&>button]:after:rounded-full [&>button]:after:bg-current [&>button]:after:opacity-60" }}
              classNames={{
                root: "mt-2 w-full lg:w-fit",
                today:
                  "rounded-(--cell-radius) [&>button]:font-semibold [&>button]:text-primary [&>button]:ring-2 [&>button]:ring-primary [&>button]:ring-inset data-[selected=true]:[&>button]:text-primary-foreground data-[selected=true]:[&>button]:ring-foreground",
              }}
              className="-mx-2 bg-transparent [--cell-size:--spacing(10)]"
              onSelect={(d) => d && pickDate(fromLocalDate(d))}
            />
            <p className="mt-1 flex items-center gap-4 text-xs text-subtle">
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded-sm ring-2 ring-primary ring-inset" aria-hidden /> Today
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-1 rounded-full bg-muted-foreground" aria-hidden /> Already logged
              </span>
            </p>
          </div>

          <div className="min-w-0">
            <div>
              <label htmlFor={inputId} className="text-sm font-semibold">
                Total impressions <span className="font-normal text-muted-foreground">for {dayLabel}</span>
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
                {showError
                  ? showError
                  : after
                    ? `Must be between ${fmt(before?.total ?? 1)} (${before ? fmtDateShort(before.date) : "minimum"}) and ${fmt(after.total)} (${fmtDateShort(after.date)}).`
                    : before
                      ? `Previous log: ${fmt(before.total)} on ${fmtDateShort(before.date)}.`
                      : "This is your first log."}
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

            {preview && (() => {
              const now = preview.row.total;
              const gain = preview.row.delta ?? now;
              const prevPct = Math.min(((now - gain) / GOAL) * 100, 100);
              const nowPct = Math.min((now / GOAL) * 100, 100);
              return (
                <div className="mt-6 border-t border-hairline pt-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-xs text-muted-foreground">To 500K</p>
                    <p className="font-mono text-xs text-foreground">
                      {fmt(now)} <span className="text-subtle">/ 500K</span>
                    </p>
                  </div>
                  <div
                    className="relative mt-2 h-2 overflow-hidden rounded-full bg-surface-highest"
                    role="img"
                    aria-label={`${fmt(now)} of 500,000. This day adds ${fmt(gain)}; ${fmt(Math.max(0, GOAL - now))} to go.`}
                  >
                    <span className="absolute inset-y-0 left-0 bg-foreground/35" style={{ width: `${prevPct}%` }} />
                    <span
                      className="absolute inset-y-0 rounded-r-full bg-primary transition-[left,width] duration-500 ease-out"
                      style={{ left: `${prevPct}%`, width: `${Math.max(nowPct - prevPct, 0.8)}%` }}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-subtle">
                    {preview.row.delta != null && (
                      <span className="flex items-center gap-1.5">
                        <span className="size-2 rounded-[2px] bg-foreground/35" aria-hidden /> before
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 text-foreground">
                      <span className="size-2 rounded-[2px] bg-primary" aria-hidden />
                      {preview.row.delta != null ? `${fmtSigned(gain)} this day` : "first log"}
                    </span>
                    <span className="ml-auto">{fmtCompact(Math.max(0, GOAL - now))} to go</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </form>

      {rows.length > 0 && (
      <section className="panel-dark rounded-2xl p-5 sm:p-8">
        <h2 className="text-xl font-bold tracking-[-0.015em]">History</h2>
        <p className="mt-0.5 mb-3 text-sm text-muted-foreground">Every log, newest first. Use the pencil to correct a day.</p>
        <EntriesTable
          rows={rows}
          limit={PAGE_SIZE}
          offset={first}
          today={today}
          onSaved={(saved) => {
            setJustSaved(saved);
            // Keep the form above in step if it's showing the day that was just edited.
            if (saved.date === date) setText(String(saved.total));
          }}
        />
        {pageCount > 1 && (
          <nav aria-label="History pages" className="mt-4 flex items-center justify-between gap-3 border-t border-hairline pt-4">
            <p className="font-mono text-xs text-muted-foreground" aria-live="polite">
              {first + 1}–{Math.min(first + PAGE_SIZE, rows.length)} of {rows.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPage(page - 1)}
                disabled={page === 0}
                className="h-10 gap-1 border-hairline bg-transparent px-3 text-sm font-semibold text-foreground hover:bg-hover"
              >
                <ChevronLeft className="size-4" /> Newer
              </Button>
              <span className="min-w-14 text-center font-mono text-xs text-muted-foreground">
                {page + 1} / {pageCount}
              </span>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPage(page + 1)}
                disabled={page >= pageCount - 1}
                className="h-10 gap-1 border-hairline bg-transparent px-3 text-sm font-semibold text-foreground hover:bg-hover"
              >
                Older <ChevronRight className="size-4" />
              </Button>
            </div>
          </nav>
        )}
      </section>
      )}
    </div>
  );
}
