"use client";

import { useActionState, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, ChefHat, Dumbbell, Moon, Scale, Trash2, Utensils, type LucideIcon } from "lucide-react";
import { FIT_CLEAR_CONFIRM_WORD } from "@/lib/validation";
import type { FitDataCounts } from "@/lib/fit";
import { clearFitData, type ClearState } from "./actions";
import { fitBusy, fitError, fitToast } from "@/components/fit/fit-toast";
import { PlateLoader } from "@/components/fit/plate-loader";
import { cn } from "@/lib/utils";

const KINDS: { key: keyof FitDataCounts; label: string; icon: LucideIcon; aria: string }[] = [
  { key: "weighIns", label: "Weigh-ins", icon: Scale, aria: "weigh-ins" },
  { key: "sets", label: "Sets", icon: Dumbbell, aria: "workout sets" },
  { key: "meals", label: "Meals", icon: Utensils, aria: "food entries" },
  { key: "days", label: "Days", icon: Moon, aria: "sleep, steps and water days" },
  { key: "foods", label: "Foods", icon: ChefHat, aria: "custom foods" },
];

const EASE = [0.2, 0.9, 0.25, 1] as const;

/** Wipes fit logs only (weigh-ins, sets, food, sleep/steps, custom foods). Profile and X progress stay. */
export function ClearFitData({ counts }: { counts: FitDataCounts }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState("");
  const [state, action, pending] = useActionState<ClearState, FormData>(
    async (prev, fd) => {
      fitBusy("Clearing your fit data…");
      const r = await clearFitData(prev, fd);
      if (r?.error) fitError(r.error, "Nothing was cleared");
      if (r?.cleared) fitToast({ title: "Fit data cleared", detail: "Fresh start. Your profile is kept.", mood: "sleepy" });
      return r;
    },
    null,
  );

  const total = KINDS.reduce((n, k) => n + counts[k.key], 0);
  const typed = word.trim().toLowerCase();
  const target = FIT_CLEAR_CONFIRM_WORD;
  // How many leading letters match the confirm word (each one loads a plate on the meter).
  let matched = 0;
  while (matched < typed.length && typed[matched] === target[matched]) matched++;
  const ready = typed === target;

  if (state?.cleared) {
    return (
      <div role="status" className="flex items-center gap-4 rounded-2xl border border-outline-variant bg-surface p-4 sm:p-5">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-steel text-background shadow-[inset_0_0_0_4px_rgb(0_0_0/0.3)]">
          <Check className="size-5" strokeWidth={3} aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block font-display text-2xl leading-none font-bold uppercase">Fresh start</span>
          <span className="mt-1 block font-mono text-xs text-ink-subtle">profile + progresshub kept</span>
        </span>
      </div>
    );
  }

  const cancel = () => {
    setOpen(false);
    setWord("");
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border bg-surface transition-colors duration-300",
        open ? "border-destructive/60" : "border-outline-variant",
      )}
    >
      {/* Header: a red bumper plate, the name, and the trigger. */}
      <div className="flex items-center gap-4 p-4 sm:p-5">
        <motion.span
          aria-hidden
          animate={open && !reduce ? { rotate: 180 } : { rotate: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="relative grid size-12 shrink-0 place-items-center rounded-full bg-destructive text-destructive-foreground shadow-[inset_0_0_0_4px_rgb(0_0_0/0.3)]"
        >
          <span className="absolute inset-[38%] rounded-full bg-background/80" />
          <span className="absolute top-1 left-1/2 h-1.5 w-0.5 -translate-x-1/2 rounded-full bg-black/30" />
        </motion.span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-2xl leading-none font-bold uppercase">Clear fit data</span>
          <span className="mt-1 block font-mono text-xs text-ink-subtle">logs only · profile stays</span>
        </span>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            disabled={total === 0}
            aria-label={total === 0 ? "Nothing to clear" : `Clear ${total} fit entries`}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-destructive/60 px-4 text-sm font-semibold text-ink transition-colors hover:bg-destructive hover:text-destructive-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40 sm:px-5"
          >
            <Trash2 className="size-4" aria-hidden />
            {total === 0 ? "Empty" : "Clear"}
          </button>
        )}
      </div>

      {/* What would go: five counts between hairlines; they turn red once the panel is armed. */}
      <ul
        aria-label={`Would delete ${KINDS.map((k) => `${counts[k.key]} ${k.aria}`).join(", ")}`}
        className="grid grid-cols-5 divide-x divide-outline-variant border-t border-outline-variant"
      >
        {KINDS.map(({ key, label, icon: Icon }) => {
          const n = counts[key];
          return (
            <li key={key} aria-hidden className="flex min-w-0 flex-col items-center gap-1 px-1 py-3">
              <Icon className={cn("size-4 transition-colors", open && n > 0 ? "text-destructive" : "text-ink-subtle")} aria-hidden />
              <span
                className={cn(
                  "font-display text-2xl leading-none font-bold tabular-nums transition-colors sm:text-3xl",
                  n === 0 ? "text-ink-subtle" : open ? "text-destructive" : "text-ink",
                  open && n > 0 && "line-through decoration-2",
                )}
              >
                {n > 999 ? `${Math.floor(n / 1000)}K` : n}
              </span>
              <span className="w-full truncate text-center font-mono text-[10px] text-ink-subtle sm:text-[11px]">{label}</span>
            </li>
          );
        })}
      </ul>

      <AnimatePresence initial={false}>
        {open && (
          <motion.form
            key="confirm"
            action={action}
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-4 border-t border-outline-variant p-4 sm:p-5">
              <label className="flex flex-col gap-2">
                <span className="flex items-baseline justify-between gap-3 text-sm text-ink-variant">
                  <span>
                    Type <span className="font-mono font-semibold text-ink">{target}</span> to confirm
                  </span>
                  <span className="font-mono text-xs text-ink-subtle">can&apos;t undo</span>
                </span>
                <input
                  name="confirm"
                  value={word}
                  onChange={(e) => setWord(e.target.value)}
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  autoFocus
                  aria-describedby="clear-meter"
                  onKeyDown={(e) => e.key === "Escape" && cancel()}
                  className="h-12 rounded-xl border border-outline bg-background px-3 font-mono text-base tracking-[0.2em] text-ink outline-none focus-visible:border-destructive focus-visible:ring-2 focus-visible:ring-destructive/40"
                />
              </label>

              {/* Confirm meter: one plate per letter of the word, loaded as you type it right. */}
              <div id="clear-meter" role="img" aria-label={`${matched} of ${target.length} letters typed`} className="flex items-center gap-1.5">
                <span className="h-1 flex-1 rounded-full bg-steel/40" aria-hidden />
                {target.split("").map((ch, i) => (
                  <motion.span
                    key={i}
                    aria-hidden
                    animate={i < matched ? { scaleY: 1, opacity: 1 } : { scaleY: 0.55, opacity: 0.35 }}
                    transition={{ duration: reduce ? 0 : 0.25, ease: EASE }}
                    className={cn(
                      "grid h-9 w-6 place-items-center rounded-[5px] font-display text-sm font-bold uppercase shadow-[inset_0_0_0_2px_rgb(0_0_0/0.25)]",
                      i < matched ? "bg-destructive text-destructive-foreground" : "bg-surface-high text-ink-subtle",
                    )}
                  >
                    {ch}
                  </motion.span>
                ))}
                <span className="h-1 flex-1 rounded-full bg-steel/40" aria-hidden />
              </div>

              {state?.error && (
                <p role="alert" className="text-sm text-ink">
                  {state.error}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={pending || !ready}
                  className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-destructive px-6 text-base font-bold text-destructive-foreground transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-40 sm:flex-none"
                >
                  {pending ? (
                    <>
                      <PlateLoader size="sm" /> Clearing…
                    </>
                  ) : (
                    <>
                      <Trash2 className="size-4" aria-hidden />
                      Clear {total} {total === 1 ? "entry" : "entries"}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={cancel}
                  className="inline-flex h-12 items-center rounded-full border border-outline px-6 text-base font-semibold text-ink-variant transition-colors hover:bg-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
