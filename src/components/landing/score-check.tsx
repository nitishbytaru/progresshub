"use client";

import { useCallback, useEffect, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { animate, AnimatePresence, motion, useMotionValue, useTransform } from "motion/react";
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
const EASE_RACE = [0.45, 0, 0.15, 1] as const;
/** Lanes on very large boards are sampled so the marks stay legible on a phone. */
const MAX_LANE_MARKS = 28;

type Score = Extract<ScoreResult, { ok: true }>;

/** Reads and writes storage that a private window may block; blocked means the pop-up shows. */
function claimFirstVisit() {
  try {
    if (localStorage.getItem(SEEN_KEY)) return false;
    localStorage.setItem(SEEN_KEY, "1");
  } catch {}
  return true;
}

const CONFETTI = Array.from({ length: 72 }, (_, i) => {
  const angle = i * 2.399963;
  const reach = 70 + ((i * 37) % 210);
  return {
    x: Math.cos(angle) * reach,
    rise: Math.sin(angle) * reach * 0.8 - 110,
    fall: 190 + ((i * 53) % 260),
    spin: ((i * 97) % 1080) - 540,
    delay: ((i * 7) % 16) / 100,
    duration: 1.5 + ((i * 11) % 8) / 10,
    lime: i % 3 !== 0,
    shape: i % 4 === 0 ? "h-3 w-1" : i % 4 === 1 ? "h-2 w-2" : "h-2 w-1.5",
  };
});

/** A burst sized for the one big moment here: finding out where you stand. */
function Confetti() {
  return (
    <div aria-hidden className="pointer-events-none absolute top-28 left-1/2 z-10">
      {CONFETTI.map((c, i) => (
        <motion.span
          key={i}
          className={`absolute block rounded-[1px] ${c.shape} ${c.lime ? "bg-primary" : "bg-foreground"}`}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.4 }}
          animate={{ x: c.x, y: [0, c.rise, c.fall], opacity: [1, 1, 0], rotate: c.spin, scale: 1 }}
          transition={{ duration: c.duration, delay: c.delay, ease: "easeOut", times: [0, 0.35, 1] }}
        />
      ))}
    </div>
  );
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
 * The reveal: a runner starts in last place and overtakes the creators really ahead of it on the
 * board. The marks, the rank and the impressions all read one progress value, so they stay in step.
 */
function RankStep({ score, onLanded }: { score: Score; onLanded: () => void }) {
  const reduced = useReduced();
  const overtaken = score.of - score.rank;
  const marks = Math.min(score.of - 1, MAX_LANE_MARKS);
  const marksOvertaken = score.of > 1 ? Math.round((overtaken / (score.of - 1)) * marks) : 0;
  const slots = marks + 1;
  const start = 0.5 / slots;
  const finish = (marksOvertaken + 0.5) / slots;

  const progress = useMotionValue(reduced ? 1 : 0);
  const [steps, setSteps] = useState(reduced ? overtaken : 0);
  const [landed, setLanded] = useState(reduced);
  const runnerX = useTransform(progress, (p) => `${(start + (finish - start) * p) * 100}%`);
  const trail = useTransform(progress, (p) => start + (finish - start) * p);
  const impressions = useTransform(progress, (p) => fmt(Math.round(score.total * p)));
  const goalFill = useTransform(progress, (p) => p * Math.min(1, score.total / LIMITS.maxTotal));
  const marksPassed = overtaken > 0 ? Math.round((steps / overtaken) * marksOvertaken) : 0;

  useEffect(() => {
    if (reduced) return;
    const controls = animate(progress, 1, {
      duration: 0.8 + Math.min(1, marksOvertaken * 0.12),
      delay: 0.25,
      ease: EASE_RACE,
      onUpdate: (p) => setSteps(Math.round(overtaken * p)),
      onComplete: () => {
        setSteps(overtaken);
        setLanded(true);
        onLanded();
      },
    });
    return () => controls.stop();
  }, [progress, overtaken, marksOvertaken, reduced, onLanded]);

  return (
    <div className="flex flex-col gap-5">
      <DialogTitle className="sr-only">
        You rank {score.rank} of {score.of} with {fmt(score.total)} impressions
      </DialogTitle>
      <div className="divide-y divide-hairline pt-6">
        <div className="flex items-end justify-between gap-4 pb-4">
          <span className="text-sm font-medium text-muted-foreground">Your rank</span>
          <span className="text-right">
            <motion.span
              key={landed ? "landed" : steps}
              className="block origin-right font-mono text-6xl leading-none font-bold tracking-[-0.03em] text-primary tabular-nums"
              initial={reduced ? false : { scale: landed ? 1.35 : 1.1 }}
              animate={{ scale: 1 }}
              transition={landed ? { type: "spring", stiffness: 420, damping: 14 } : { duration: 0.16, ease: EASE_OUT }}
            >
              #{fmt(score.of - steps)}
            </motion.span>
            <span className="mt-1.5 block font-mono text-xs text-muted-foreground">of {fmt(score.of)}</span>
          </span>
        </div>

        <div className="py-4">
          <div className="relative h-5" aria-hidden>
            <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-surface-highest" />
            <motion.div className="absolute inset-x-0 top-1/2 h-0.5 origin-left -translate-y-1/2 rounded-full bg-primary" style={{ scaleX: trail }} />
            {Array.from({ length: marks }, (_, i) => (
              <span
                key={i}
                className={`absolute top-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors duration-150 ${i < marksPassed ? "bg-primary" : "bg-foreground/40"}`}
                style={{ left: `${((i + 1) / slots) * 100}%` }}
              />
            ))}
            <motion.div className="absolute inset-0" style={{ x: runnerX }}>
              <span className="absolute top-1/2 left-0 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-primary" />
              {landed && !reduced && (
                <motion.span
                  className="absolute top-1/2 left-0 -mt-3 -ml-3 h-6 w-6 rounded-full border-2 border-primary"
                  initial={{ scale: 0.5, opacity: 1 }}
                  animate={{ scale: 3.2, opacity: 0 }}
                  transition={{ duration: 0.7, ease: EASE_OUT }}
                />
              )}
            </motion.div>
          </div>
          <div className="mt-1 flex justify-between font-mono text-xs text-muted-foreground" aria-hidden>
            <span>#{fmt(score.of)}</span>
            <span>#1</span>
          </div>
        </div>

        <div className="pt-4">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-sm font-medium text-muted-foreground">Impressions</span>
            <motion.span className="font-mono text-2xl font-bold tabular-nums">{impressions}</motion.span>
          </div>
          <div
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-highest"
            role="img"
            aria-label={`${fmt(score.total)} of 500,000 impressions`}
            title={`${fmt(score.total)} of 500,000 impressions`}
          >
            <motion.div className="h-full origin-left rounded-full bg-primary" style={{ scaleX: goalFill }} />
          </div>
          <p className="mt-1.5 text-right font-mono text-xs text-muted-foreground">of 500K</p>
        </div>
      </div>
    </div>
  );
}

/** Their share card, drawn with the real numbers and held shut until they log in. */
function LockedCard({ score, instant }: { score: Score; instant: boolean }) {
  const fraction = Math.min(1, score.total / LIMITS.maxTotal);
  return (
    <motion.div
      role="img"
      aria-label={`Your rank card, number ${score.rank} of ${score.of} with ${fmt(score.total)} impressions, locked until you log in`}
      className="flex flex-col gap-3 rounded-xl border border-border p-4"
      style={{ transformPerspective: 800 }}
      initial={instant ? false : { opacity: 0, scale: 0.9, rotateX: 22, y: 18 }}
      animate={{ opacity: 1, scale: 1, rotateX: 0, y: 0 }}
      transition={{ type: "spring", stiffness: 240, damping: 20, delay: 0.08 }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-bold tracking-[-0.02em]">
          <BrandMark className="size-5" /> progresshub
        </span>
        <motion.span
          className="grid size-7 place-items-center rounded-full bg-foreground text-background"
          initial={instant ? false : { scale: 0, rotate: 0 }}
          animate={instant ? { scale: 1 } : { scale: 1, rotate: [0, -14, 11, -6, 0] }}
          transition={{ scale: { type: "spring", stiffness: 420, damping: 16, delay: 0.32 }, rotate: { duration: 0.5, delay: 0.62 } }}
        >
          <Lock className="size-3.5" aria-hidden />
        </motion.span>
      </div>
      <div className="flex items-end justify-between gap-4">
        <span className="font-mono text-5xl leading-none font-bold tracking-[-0.03em] text-primary tabular-nums">#{fmt(score.rank)}</span>
        <span className="font-mono text-xs text-muted-foreground">of {fmt(score.of)}</span>
      </div>
      <p aria-hidden className="text-lg font-bold tracking-[-0.02em] blur-[5px] select-none">
        @yourhandle
      </p>
      <div>
        <div className="flex items-baseline justify-between gap-3 font-mono text-xs tabular-nums">
          <span className="font-bold">{fmt(score.total)}</span>
          <span className="text-muted-foreground">/ 500K</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-highest">
          <motion.div
            className="h-full origin-left rounded-full bg-primary"
            initial={instant ? false : { scaleX: 0 }}
            animate={{ scaleX: fraction }}
            transition={{ duration: 0.7, delay: 0.25, ease: EASE_OUT }}
          />
        </div>
      </div>
    </motion.div>
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

/** First-visit pop-up on the landing page: type a number, see your rank, log in to share it. */
export function ScoreCheck() {
  const reduced = useReduced();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState<Score | null>(null);
  const [sharing, setSharing] = useState(false);
  const [landed, setLanded] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const markLanded = useCallback(() => setLanded(true), []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (claimFirstVisit()) setOpen(true);
    }, OPEN_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const reopen = () => {
      claimFirstVisit();
      setSharing(false);
      setLanded(false);
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

  const step = !score ? "enter" : sharing ? "login" : "rank";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        // Opening the keyboard uninvited would cover the page on a phone.
        ref={popupRef}
        initialFocus={() => (window.matchMedia("(pointer: fine)").matches ? inputRef.current : popupRef.current)}
        className="gap-5 border border-border p-6 sm:max-w-sm"
      >
        {landed && !reduced && step === "rank" && <Confetti />}
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

            {step === "rank" && score && (
              <Step key="rank" instant={reduced}>
                <div className="flex flex-col gap-5">
                  <RankStep score={score} onLanded={markLanded} />
                  <motion.button
                    type="button"
                    autoFocus
                    onClick={() => setSharing(true)}
                    className={CTA}
                    animate={landed && !reduced ? { scale: [1, 1.04, 1] } : undefined}
                    transition={{ duration: 0.45, ease: EASE_OUT }}
                  >
                    Share your rank with others
                  </motion.button>
                </div>
              </Step>
            )}

            {step === "login" && score && (
              <Step key="login" instant={reduced}>
                <div className="flex flex-col gap-5">
                  <DialogTitle className={HEADING}>Log in to share your rank</DialogTitle>
                  <LockedCard score={score} instant={reduced} />
                  <Link href={LOGIN_HREF} autoFocus className={CTA}>
                    Log in
                  </Link>
                </div>
              </Step>
            )}
          </AnimatePresence>
        </AutoHeight>
        {score && (
          <p role="status" className="sr-only">
            {step === "rank" ? `You rank ${score.rank} of ${score.of}.` : "Log in to share your rank."}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
