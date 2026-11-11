"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { animate, AnimatePresence, motion } from "motion/react";
import { useReduced } from "@/components/landing/motion-bits";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { checkScore, type ScoreResult } from "@/app/welcome/score-actions";
import { Lock } from "lucide-react";
import { BrandMark } from "@/components/shell/brand";
import { fmt } from "@/lib/format";
import { LIMITS } from "@/lib/validation";

const SEEN_KEY = "progresshub:score-check-seen";
const OPEN_EVENT = "progresshub:open-score-check";
const OPEN_DELAY_MS = 2000;
const LOGIN_HREF = "/login?next=/claim";
const CTA =
  "inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary-hover active:bg-primary-pressed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const HEADING = "pr-6 text-xl leading-snug font-semibold tracking-[-0.02em] text-balance";
const EASE_OUT = [0.16, 1, 0.3, 1] as const;
/** Fake rows around "You" in the preview. Placeholder text only: no real creator data is sent. */
const GHOSTS = [
  { name: "▒▒▒▒▒▒▒▒", total: "000K" },
  { name: "▒▒▒▒▒▒", total: "000K" },
  { name: "▒▒▒▒▒▒▒▒▒", total: "00K" },
  { name: "▒▒▒▒▒", total: "00K" },
];

type Score = Extract<ScoreResult, { ok: true }>;

/** Reads and writes storage that a private window may block; blocked means the pop-up shows. */
function claimFirstVisit() {
  try {
    if (localStorage.getItem(SEEN_KEY)) return false;
    localStorage.setItem(SEEN_KEY, "1");
  } catch {}
  return true;
}

/** Smooths the pop-up's size between steps so it never jumps. */
function AutoHeight({ children, instant }: { children: ReactNode; instant: boolean }) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");

  useEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;
    const observer = new ResizeObserver(() => setHeight(inner.offsetHeight));
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      className="-m-2 overflow-hidden"
      initial={false}
      animate={{ height }}
      transition={{ duration: instant ? 0 : 0.35, ease: EASE_OUT }}
    >
      <div ref={innerRef} className="p-2">
        {children}
      </div>
    </motion.div>
  );
}

/** One step of the flow: leaves fast, arrives slightly slower and out of focus. */
function Step({ children, instant }: { children: ReactNode; instant: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: instant ? 0 : 14, filter: instant ? "blur(0px)" : "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: instant ? 0 : -10, transition: { duration: 0.14 } }}
      transition={{ duration: 0.32, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

/** Fills toward 500K as the visitor types, so the goal is clear before they submit. */
function GoalMeter({ value }: { value: string }) {
  const typed = Number(value.replace(/[\s,]/g, ""));
  const total = Number.isFinite(typed) && typed > 0 ? typed : 0;
  const fraction = Math.min(1, total / LIMITS.maxTotal);
  return (
    <div aria-hidden className="flex items-center gap-3">
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-highest">
        <motion.div
          className="h-full origin-left rounded-full bg-primary"
          initial={false}
          animate={{ scaleX: fraction }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
        />
      </div>
      <span className="font-mono text-xs text-muted-foreground tabular-nums">{fmt(Math.min(total, LIMITS.maxTotal))}/500K</span>
    </div>
  );
}

/**
 * Where you'd stand, with the rank held back: a 5-row slice of the board in leaderboard style.
 * Other rows are blurred placeholders; your row shows your real total and a blurred, locked rank.
 * The server never sends the rank, so there's nothing to un-blur.
 */
function BlurredBoard({ score, instant }: { score: Score; instant: boolean }) {
  // Up to 2 rows above and 2 below; fewer when the board is tiny.
  const others = Math.min(4, Math.max(0, score.of - 1));
  const above = Math.ceil(others / 2);
  const rows: ("you" | (typeof GHOSTS)[number])[] = [...GHOSTS.slice(0, above), "you", ...GHOSTS.slice(above, others)];
  const fraction = Math.min(1, score.total / LIMITS.maxTotal);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3 pr-6">
        <DialogTitle className="text-xl leading-snug font-semibold tracking-[-0.02em]">Where you&apos;d stand</DialogTitle>
        <span className="shrink-0 font-mono text-xs text-muted-foreground">of {fmt(score.of)}</span>
      </div>
      <ol
        className="overflow-hidden rounded-xl border border-border"
        aria-label={`Your rank is hidden. Log in to see where you stand among ${fmt(score.of)} creators.`}
      >
        {rows.map((row, i) =>
          row === "you" ? (
            <motion.li
              key="you"
              className="relative flex items-center gap-3 border-b border-hairline bg-primary-soft px-3 py-3 last:border-b-0"
              initial={instant ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 22, delay: instant ? 0 : 0.1 + i * 0.06 }}
            >
              <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-primary" />
              <span className="flex h-7 min-w-11 items-center justify-center gap-1 rounded-full bg-primary px-2 font-mono text-xs font-semibold text-primary-foreground">
                <Lock className="size-3" aria-hidden />
                <span aria-hidden className="blur-[3px] select-none">00</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">You</span>
                <span className="mt-1 block h-1 overflow-hidden rounded-full bg-surface-highest" aria-hidden>
                  <motion.span
                    className="block h-full origin-left rounded-full bg-primary"
                    initial={instant ? false : { scaleX: 0 }}
                    animate={{ scaleX: fraction }}
                    transition={{ duration: 0.7, delay: instant ? 0 : 0.3, ease: EASE_OUT }}
                  />
                </span>
              </span>
              <span className="font-mono text-sm font-semibold text-primary tabular-nums">{fmt(score.total)}</span>
            </motion.li>
          ) : (
            <motion.li
              key={i}
              aria-hidden
              className="flex items-center gap-3 border-b border-hairline px-3 py-3 select-none last:border-b-0"
              initial={instant ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: instant ? 0 : i * 0.06, ease: EASE_OUT }}
            >
              <span className="flex h-7 min-w-11 items-center justify-center rounded-full border border-border font-mono text-xs blur-[3px]">#00</span>
              <span className="flex-1 text-sm font-semibold text-muted-foreground blur-[5px]">{row.name}</span>
              <span className="font-mono text-sm text-muted-foreground blur-[5px]">{row.total}</span>
            </motion.li>
          ),
        )}
      </ol>
    </div>
  );
}

/** Lets anyone who closed the pop-up, or came back later, check their rank again. */
export function ScoreCheckButton({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}>
      {children}
    </button>
  );
}

/** First-visit pop-up on the landing page: type a number, see a blurred preview of your spot, log in to reveal it. */
export function ScoreCheck() {
  const reduced = useReduced();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState<Score | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (claimFirstVisit()) setOpen(true);
    }, OPEN_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const reopen = () => {
      claimFirstVisit();
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, reopen);
    return () => window.removeEventListener(OPEN_EVENT, reopen);
  }, []);

  const fail = (message: string) => {
    setError(message);
    if (!reduced && fieldRef.current) animate(fieldRef.current, { x: [0, -7, 7, -4, 4, 0] }, { duration: 0.32 });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    // "Today" for the saved log follows the visitor's own day, including right after login.
    document.cookie = `tz=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}; path=/; max-age=31536000; samesite=lax`;
    startTransition(async () => {
      try {
        const result = await checkScore(value);
        if (result.ok) setScore(result);
        else fail(result.error);
      } catch {
        fail("Couldn't check that. Check your connection and try again.");
      }
    });
  };

  const step = score ? "preview" : "enter";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        // Opening the keyboard uninvited would cover the page on a phone.
        ref={popupRef}
        initialFocus={() => (window.matchMedia("(pointer: fine)").matches ? inputRef.current : popupRef.current)}
        className="gap-5 border border-border p-6 sm:max-w-sm"
      >
        <AutoHeight instant={reduced}>
          <AnimatePresence mode="wait" initial={false}>
            {step === "enter" && (
              <Step key="enter" instant={reduced}>
                <form onSubmit={submit} noValidate className="flex flex-col gap-5">
                  <BrandMark className="size-8" />
                  <DialogTitle className={HEADING}>
                    Enter your current verified home timeline impressions to check your rank
                  </DialogTitle>
                  <div className="flex flex-col gap-2">
                    <div ref={fieldRef}>
                      <Input
                        ref={inputRef}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        aria-label="Verified home timeline impressions"
                        aria-invalid={Boolean(error)}
                        aria-describedby={error ? "score-error" : undefined}
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="26800"
                        className="h-12 font-mono text-lg tabular-nums"
                      />
                    </div>
                    <GoalMeter value={value} />
                    <p className="text-xs text-muted-foreground">Copy your total from X analytics</p>
                    {error && (
                      <p id="score-error" role="alert" className="text-sm text-foreground">
                        {error}
                      </p>
                    )}
                  </div>
                  <button type="submit" disabled={pending || !value.trim()} className={CTA}>
                    {pending ? "Checking…" : "Check my rank"}
                  </button>
                </form>
              </Step>
            )}

            {step === "preview" && score && (
              <Step key="preview" instant={reduced}>
                <div className="flex flex-col gap-5">
                  <BlurredBoard score={score} instant={reduced} />
                  <Link href={LOGIN_HREF} autoFocus className={`${CTA} gap-2`}>
                    <Lock className="size-4" aria-hidden />
                    Log in to see your rank
                  </Link>
                </div>
              </Step>
            )}
          </AnimatePresence>
        </AutoHeight>
        {score && (
          <p role="status" className="sr-only">
            Your rank is hidden. Log in to see where you stand among {fmt(score.of)} creators.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
