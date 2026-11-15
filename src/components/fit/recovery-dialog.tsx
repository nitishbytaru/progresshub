"use client";

import { useState, useTransition } from "react";
import { motion } from "motion/react";
import { Moon, Sun } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { setSleep } from "@/app/(fit)/fit/log/set-actions";
import { Dumbo } from "./dumbo";
import { fitBusy, fitError, fitToast } from "./fit-toast";
import { PlateLoader } from "./plate-loader";

const toMin = (v: string) => (/^\d{2}:\d{2}$/.test(v) ? Number(v.slice(0, 2)) * 60 + Number(v.slice(3)) : null);
/** Minutes from bed to wake, across midnight. */
const span = (bed: string, wake: string) => {
  const b = toMin(bed);
  const w = toMin(wake);
  return b === null || w === null ? null : (w - b + 1440) % 1440 || 1440;
};
const hm = (m: number) => `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} m` : ""}`;

/**
 * Recovery: last night's sleep from bedtime and wake-up time. Opens from the button beside
 * "Log sets"; shows the hours live on a night timeline (6 pm → noon) and saves only sleep.
 */
export function RecoveryButton({ day, sleep, className = "" }: { day: string; sleep: number | null; className?: string }) {
  const [open, setOpen] = useState(false);
  const [bed, setBed] = useState("23:00");
  const [wake, setWake] = useState("07:00");
  const [msg, setMsg] = useState<string | null>(null);
  const [saved, setSaved] = useState(sleep);
  const [pending, start] = useTransition();

  const mins = span(bed, wake);
  const ok = mins !== null && mins >= 30 && mins <= 16 * 60;
  const hours = mins === null ? 0 : mins / 60;
  const verdict = !ok ? null : hours < 6 ? "Short night" : hours < 7 ? "A bit short" : hours <= 9 ? "Well rested" : "Long sleep";
  // Night timeline: 18:00 → 12:00 next day (18 h wide).
  const pos = (v: string) => {
    const m = toMin(v);
    if (m === null) return 0;
    return Math.min(1, Math.max(0, ((m - 18 * 60 + 1440) % 1440) / (18 * 60)));
  };
  const from = pos(bed);
  const to = Math.max(from, pos(wake));

  const save = () =>
    start(async () => {
      fitBusy("Saving sleep…");
      const r = await setSleep(day, { bed, wake });
      if (r.error) {
        setMsg(r.error);
        fitError(r.error, "Sleep not saved");
        return;
      }
      setSaved(r.hours ?? null);
      setMsg(null);
      setOpen(false);
      fitToast({ title: `Slept ${hm(mins ?? 0)}`, detail: `${bed} → ${wake}${verdict ? ` · ${verdict.toLowerCase()}` : ""}`, mood: hours < 6 ? "sleepy" : "happy" });
    });

  const timeIn =
    "h-14 w-full min-w-0 rounded-2xl border border-outline bg-background px-3 font-display text-xl font-bold tabular-nums outline-none [color-scheme:dark] focus:border-ink sm:text-2xl";

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        whileTap={{ scale: 0.95 }}
        className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-outline px-4 text-sm font-bold text-ink-variant transition-colors hover:bg-hover hover:text-ink ${className}`}
      >
        <Moon className="size-4" aria-hidden />
        Recovery
        {saved !== null && <span className="rounded-full bg-primary-soft px-2 py-0.5 font-display text-sm text-ink tabular-nums">{saved} h</span>}
      </motion.button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92dvh] gap-5 overflow-y-auto rounded-2xl border border-outline-variant bg-surface p-5 sm:max-w-md">
          <div className="flex items-center gap-3">
            <span className="grid h-16 w-20 shrink-0 place-items-center rounded-xl bg-background pt-1">
              <Dumbo mood={ok && hours < 6 ? "sleepy" : "happy"} size={72} />
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <DialogTitle className="font-display text-3xl leading-none font-bold uppercase">Recovery</DialogTitle>
              <DialogDescription className="text-sm text-ink-subtle">When did you sleep last night?</DialogDescription>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="flex items-center gap-1.5 text-xs font-bold tracking-[0.14em] text-ink-subtle uppercase">
                <Moon className="size-3.5" aria-hidden /> Went to bed
              </span>
              <input type="time" value={bed} onChange={(e) => setBed(e.target.value)} className={timeIn} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="flex items-center gap-1.5 text-xs font-bold tracking-[0.14em] text-ink-subtle uppercase">
                <Sun className="size-3.5" aria-hidden /> Woke up
              </span>
              <input type="time" value={wake} onChange={(e) => setWake(e.target.value)} className={timeIn} />
            </label>
          </div>

          {/* The night at a glance: 6 pm to noon, your sleep as a chalk band. */}
          <div className="flex flex-col gap-2 rounded-2xl border border-outline-variant bg-background p-4">
            <div className="flex items-baseline justify-between">
              <span className="font-display text-4xl leading-none font-bold tabular-nums">{ok ? hm(mins!) : "—"}</span>
              {verdict && <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-bold">{verdict}</span>}
            </div>
            <div className="relative h-3 rounded-full bg-track" role="img" aria-label={ok ? `Asleep ${bed} to ${wake}, ${hm(mins!)}` : "Times not set"}>
              {ok && (
                <motion.span
                  className="absolute inset-y-0 rounded-full bg-ink"
                  initial={false}
                  animate={{ left: `${from * 100}%`, width: `${Math.max(2, (to - from) * 100)}%` }}
                  transition={{ type: "spring", stiffness: 200, damping: 26 }}
                />
              )}
            </div>
            <div className="flex justify-between text-[0.6875rem] font-bold text-ink-subtle" aria-hidden>
              <span>6 pm</span>
              <span>Midnight</span>
              <span>6 am</span>
              <span>Noon</span>
            </div>
          </div>

          <button
            type="button"
            disabled={pending || !ok}
            onClick={save}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary font-bold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {pending ? (
              <>
                <PlateLoader size="sm" /> Saving…
              </>
            ) : (
              "Save sleep"
            )}
          </button>
          <p aria-live="polite" className="-mt-2 min-h-5 text-sm text-ink-variant">
            {msg}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
