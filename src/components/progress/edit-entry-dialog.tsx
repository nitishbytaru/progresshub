"use client";

import { useId, useState, useTransition } from "react";
import { Check, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { saveEntry } from "@/app/(app)/progress/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { fmt, fmtDate, fmtDateShort, fmtPct, fmtSigned } from "@/lib/format";
import { toUTC, withDeltas, type Entry } from "@/lib/progress";
import { cn } from "@/lib/utils";
import { LIMITS, parseImpressions, validateEntry } from "@/lib/validation";

type Props = {
  /** The day being corrected. */
  date: string;
  /** Every log, so the new number can be checked against its neighbours. */
  entries: Entry[];
  today: string;
  /** Lets a parent with local state (the log form) pick up the change instantly. */
  onSaved?: (entry: Entry) => void;
};

/** Pencil button that corrects one day's total in a modal, without leaving the page. */
export function EditEntryDialog({ date, entries, today, onSaved }: Props) {
  const current = entries.find((e) => e.date === date);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(current ? String(current.total) : "");
  const [touched, setTouched] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const inputId = useId();

  const sorted = [...entries].sort((a, b) => toUTC(a.date) - toUTC(b.date));
  const before = [...sorted].reverse().find((e) => toUTC(e.date) < toUTC(date)) ?? null;
  const after = sorted.find((e) => toUTC(e.date) > toUTC(date)) ?? null;

  const parsed = parseImpressions(text);
  const value = parsed.value;
  const error = parsed.error ?? validateEntry({ date, total: value, today, before, after });
  const showError = serverError ?? (value === null && !parsed.error ? (touched ? error : null) : error);
  const unchanged = value === current?.total;

  const preview = (() => {
    if (value === null || error) return null;
    return withDeltas([...entries.filter((e) => e.date !== date), { date, total: value }]).find((r) => r.date === date)!;
  })();

  const onOpenChange = (next: boolean) => {
    if (next) {
      // Always start from the saved number, never a half-typed one from last time.
      setText(current ? String(current.total) : "");
      setTouched(false);
      setServerError(null);
    }
    setOpen(next);
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setServerError(null);
    if (error || value === null) return;
    if (unchanged) return setOpen(false);
    startSaving(async () => {
      const result = await saveEntry(date, value);
      if (!result.ok) {
        setServerError(result.error);
        return;
      }
      onSaved?.({ date, total: value });
      setOpen(false);
      toast.success(`Updated ${fmtDate(date)}: ${fmt(value)}`);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-hairline hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-label={`Edit log for ${fmtDate(date)}`}
          />
        }
      >
        <Pencil className="size-4" />
      </DialogTrigger>

      <DialogContent className="panel-dark gap-0 rounded-2xl p-0 ring-0 sm:max-w-[440px] [&>[data-slot=dialog-close]]:top-4 [&>[data-slot=dialog-close]]:right-4">
        <form onSubmit={save} noValidate>
          <div className="border-b border-hairline px-5 py-4 pr-14 sm:px-6">
            <DialogTitle className="text-lg font-bold tracking-[-0.015em] text-foreground">
              Edit {fmtDate(date)}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Correct the total you copied from X analytics.
            </DialogDescription>
          </div>

          <div className="p-5 sm:p-6">
            <label htmlFor={inputId} className="text-sm font-semibold text-foreground">
              Total impressions
            </label>
            <div
              className={cn(
                "mt-2.5 flex h-14 items-center rounded-xl border bg-surface-high px-4 transition-colors focus-within:border-foreground focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary",
                showError ? "border-foreground" : "border-hairline",
              )}
            >
              <input
                id={inputId}
                inputMode="numeric"
                autoComplete="off"
                autoFocus
                maxLength={24}
                placeholder={before ? `at least ${fmt(before.total)}` : "e.g. 157,400"}
                value={/^\d+$/.test(text) ? fmt(Number(text)) : text}
                onChange={(e) => {
                  setServerError(null);
                  const typed = e.target.value;
                  const digits = typed.replace(/[\s,]/g, "");
                  setText(/^\d*$/.test(digits) ? digits.slice(0, LIMITS.maxDigits + 1) : typed);
                }}
                onBlur={() => setTouched(true)}
                aria-invalid={Boolean(showError)}
                aria-describedby={`${inputId}-msg`}
                className="w-full min-w-0 bg-transparent font-mono text-xl font-semibold tracking-[-0.03em] text-foreground caret-primary outline-none placeholder:text-base placeholder:font-normal placeholder:tracking-normal placeholder:text-muted-foreground"
              />
            </div>
            <p id={`${inputId}-msg`} className={cn("mt-2 min-h-5 text-sm", showError ? "font-medium text-foreground" : "text-muted-foreground")}>
              {showError
                ? showError
                : after
                  ? `Between ${fmt(before?.total ?? 1)}${before ? ` (${fmtDateShort(before.date)})` : ""} and ${fmt(after.total)} (${fmtDateShort(after.date)}).`
                  : before
                    ? `Previous log: ${fmt(before.total)} on ${fmtDateShort(before.date)}.`
                    : "This is your first log."}
            </p>

            <div className="mt-4 grid grid-cols-2 divide-x divide-hairline rounded-xl border border-hairline">
              <div className="p-3 sm:p-4">
                <p className="text-xs text-muted-foreground">Daily gain</p>
                <p className="mt-1 font-mono text-base font-semibold tracking-[-0.02em]">
                  {preview?.delta != null ? <span className="text-primary">{fmtSigned(preview.delta)}</span> : "—"}
                </p>
              </div>
              <div className="p-3 sm:p-4">
                <p className="text-xs text-muted-foreground">Of 500K</p>
                <p className="mt-1 font-mono text-base font-semibold tracking-[-0.02em]">
                  {preview ? fmtPct(preview.progressPct, 2) : "—"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-hairline px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <DialogClose
              render={
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 px-5 text-sm font-semibold text-foreground hover:bg-hover"
                />
              }
            >
              Cancel
            </DialogClose>
            <Button
              type="submit"
              disabled={saving}
              className="h-11 gap-2 bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary-hover active:bg-primary-pressed"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" strokeWidth={2.5} />}
              {saving ? "Saving…" : "Save change"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
