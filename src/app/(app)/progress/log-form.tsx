"use client";

import { useId, useMemo, useState } from "react";
import { CalendarDays, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { EntriesTable } from "@/components/progress/entries-table";
import { Button } from "@/components/ui/button";
import { fmt, fmtDate, fmtDateShort, fmtPct, fmtSigned } from "@/lib/format";
import { addDays, forecast, GOAL, paceOver, toUTC, withDeltas, type Entry } from "@/lib/progress";
import { cn } from "@/lib/utils";

type Props = { initialEntries: Entry[]; today: string; initialDate?: string };

export function LogForm({ initialEntries, today, initialDate }: Props) {
  const [entries, setEntries] = useState(initialEntries);
  const yesterday = addDays(today, -1);
  const startDate =
    initialDate && toUTC(initialDate) <= toUTC(today) ? initialDate : today;
  const [date, setDate] = useState(startDate);
  const existing = entries.find((e) => e.date === date);
  const [raw, setRaw] = useState(existing ? String(existing.total) : "");
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const inputId = useId();
  const dateId = useId();

  const pickDate = (d: string) => {
    setDate(d);
    const found = entries.find((e) => e.date === d);
    setRaw(found ? String(found.total) : "");
    setTouched(false);
  };

  const value = raw === "" ? null : Number(raw);
  const sorted = useMemo(() => [...entries].sort((a, b) => toUTC(a.date) - toUTC(b.date)), [entries]);
  const before = [...sorted].reverse().find((e) => toUTC(e.date) < toUTC(date)) ?? null;
  const after = sorted.find((e) => toUTC(e.date) > toUTC(date)) ?? null;

  const error =
    value === null
      ? "Enter your total impressions from X analytics."
      : value <= 0
        ? "Enter a number above zero."
        : before && value < before.total
          ? `That's lower than your ${fmtDateShort(before.date)} total of ${fmt(before.total)}. Totals only go up, so check the number in X analytics.`
          : after && value > after.total
            ? `That's higher than your ${fmtDateShort(after.date)} total of ${fmt(after.total)}. Fix that day first or check this number.`
            : null;

  const preview = useMemo(() => {
    if (value === null || error) return null;
    const next = withDeltas([...entries.filter((e) => e.date !== date), { date, total: value }]);
    const row = next.find((r) => r.date === date)!;
    const last = next[next.length - 1];
    const eta = forecast(last.total, paceOver(next, 7), last.date);
    return { row, eta };
  }, [value, error, entries, date]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (error || value === null) return;
    setSaving(true);
    // TODO(supabase): upsert { user_id, date, total } into progress_entries.
    await new Promise((r) => setTimeout(r, 350));
    setEntries((prev) => [...prev.filter((p) => p.date !== date), { date, total: value }]);
    setSaving(false);
    toast.success(`${existing ? "Updated" : "Logged"} ${fmtDate(date)}: ${fmt(value)}`, {
      description: "Sample mode: kept for this session only until your account is connected.",
    });
  };

  const rows = useMemo(() => withDeltas(entries), [entries]);
  const showError = touched && error;

  const dateChoices = [
    { d: today, label: "Today", sub: fmtDateShort(today) },
    { d: yesterday, label: "Yesterday", sub: fmtDateShort(yesterday) },
  ];
  const isCustom = date !== today && date !== yesterday;

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
        <form onSubmit={save} noValidate className="panel-paper rounded-2xl p-5 sm:p-8">
          <h2 className="text-xl font-bold tracking-[-0.015em]">
            {existing ? `Update ${fmtDate(date)}` : "Log your impressions"}
          </h2>
          <p className="mt-1 text-sm text-paper-muted">
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
                      ? "border-paper-foreground bg-paper-foreground text-paper"
                      : "border-paper-border hover:bg-paper-dim",
                  )}
                >
                  {label}
                  <span className={cn("font-mono text-[11px] font-normal", date === d ? "text-paper/70" : "text-paper-muted")}>
                    {sub}
                  </span>
                </button>
              ))}
              <label
                htmlFor={dateId}
                className={cn(
                  "relative flex h-14 cursor-pointer flex-col items-center justify-center rounded-lg border text-sm font-semibold transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-paper-foreground",
                  isCustom
                    ? "border-paper-foreground bg-paper-foreground text-paper"
                    : "border-paper-border hover:bg-paper-dim",
                )}
              >
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-4" /> Other
                </span>
                <span className={cn("font-mono text-[11px] font-normal", isCustom ? "text-paper/70" : "text-paper-muted")}>
                  {isCustom ? fmtDateShort(date) : "pick a day"}
                </span>
                <input
                  id={dateId}
                  type="date"
                  max={today}
                  value={date}
                  onChange={(e) => e.target.value && pickDate(e.target.value)}
                  className="absolute inset-0 cursor-pointer opacity-0 [color-scheme:light]"
                  aria-label="Pick another day"
                />
              </label>
            </div>
          </fieldset>

          <div className="mt-6">
            <label htmlFor={inputId} className="text-sm font-semibold">
              Total impressions
            </label>
            <div
              className={cn(
                "mt-2.5 flex h-16 items-center gap-3 rounded-xl border bg-paper-dim px-4 transition-colors focus-within:border-paper-foreground focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary",
                showError ? "border-paper-foreground" : "border-paper-border",
              )}
            >
              <input
                id={inputId}
                inputMode="numeric"
                autoComplete="off"
                placeholder={before ? `more than ${fmt(before.total)}` : "e.g. 157,400"}
                value={raw === "" ? "" : fmt(Number(raw))}
                onChange={(e) => setRaw(e.target.value.replace(/\D/g, "").slice(0, 10))}
                onBlur={() => raw !== "" && setTouched(true)}
                aria-invalid={Boolean(showError)}
                aria-describedby={`${inputId}-msg`}
                className="w-full min-w-0 bg-transparent font-mono text-2xl font-semibold tracking-[-0.03em] text-paper-foreground caret-paper-foreground outline-none placeholder:text-base placeholder:font-normal placeholder:tracking-normal placeholder:text-paper-muted"
              />
              {existing && (
                <span className="shrink-0 rounded-full border border-paper-border px-2.5 py-1 text-[11px] font-medium text-paper-muted">
                  Logged
                </span>
              )}
            </div>
            <p id={`${inputId}-msg`} className={cn("mt-2 min-h-5 text-sm", showError ? "font-medium" : "text-paper-muted")}>
              {showError ? error : before ? `Previous log: ${fmt(before.total)} on ${fmtDateShort(before.date)}.` : "This is your first log."}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-3 divide-x divide-paper-border rounded-xl border border-paper-border">
            {[
              { label: "Daily gain", value: preview?.row.delta != null ? fmtSigned(preview.row.delta) : "—", key: true },
              { label: "Of 500K", value: preview ? fmtPct(preview.row.progressPct, 2) : "—" },
              { label: "500K around", value: preview?.eta ? fmtDateShort(preview.eta.etaDate) : "—" },
            ].map((s) => (
              <div key={s.label} className="p-3 sm:p-4">
                <p className="text-xs text-paper-muted">{s.label}</p>
                <p className="mt-1 font-mono text-base font-semibold tracking-[-0.02em] sm:text-lg">
                  {s.key && preview ? <span className="rounded bg-primary px-1">{s.value}</span> : s.value}
                </p>
              </div>
            ))}
          </div>

          {preview && (
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-paper-dim" aria-hidden>
              <div
                className="h-full rounded-full bg-primary ring-1 ring-paper-foreground/15 transition-[width] duration-500 ease-out"
                style={{ width: `${Math.min((preview.row.total / GOAL) * 100, 100)}%` }}
              />
            </div>
          )}

          <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {raw !== (existing ? String(existing.total) : "") && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => pickDate(date)}
                className="h-12 px-5 text-sm font-semibold text-paper-foreground hover:bg-paper-dim"
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
            <p className="mt-2 text-sm text-muted-foreground">days logged since {fmtDate(rows[0].date)}</p>
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

      <section className="panel-paper rounded-2xl p-5 sm:p-8">
        <h2 className="text-xl font-bold tracking-[-0.015em]">History</h2>
        <p className="mt-0.5 mb-3 text-sm text-paper-muted">Every log, newest first. Pick a day above to correct it.</p>
        <EntriesTable rows={rows} limit={rows.length} />
      </section>
    </div>
  );
}
