"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useReduced } from "@/components/landing/motion-bits";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { finishTutorial } from "./tour-actions";
import { AnalyticsDemo, ConnectDemo, LeaderboardDemo, LogDemo, OverviewDemo, ShareDemo } from "./tour-demos";

export const TOUR_EVENT = "progresshub:tour";

const SEEN_KEY = "progresshub-tutorial-done";
const EASE = [0.16, 1, 0.3, 1] as const;

const STEPS = [
  { href: "/progress", title: "Log daily", tags: ["once a day"], meaning: "Save your X analytics total once a day.", Demo: LogDemo },
  { href: "/", title: "See progress", tags: ["sample"], meaning: "Your total, progress and estimated 500K date.", Demo: OverviewDemo },
  { href: "/analytics", title: "Spot trends", tags: [], meaning: "Your impressions over time.", Demo: AnalyticsDemo },
  { href: "/leaderboard", title: "Climb ranks", tags: [], meaning: "Every creator racing to 500K.", Demo: LeaderboardDemo },
  { href: "/share", title: "Post on X", tags: [], meaning: "Pick a card and post it to X.", Demo: ShareDemo },
  { href: "/connect", title: "Use Telegram", tags: [], meaning: "Link Telegram for reminders and logging.", Demo: ConnectDemo },
];

type Mode = "first" | "replay";
type Box = { left: number; top: number; width: number; height: number };

const subscribeNothing = () => () => {};
const readSeen = (key: string) => {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
};

/** The visible nav tab for a route (the sidebar and the phone tab bar each have one). */
function findTab(href: string): Box | null {
  for (const el of document.querySelectorAll<HTMLElement>(`[data-tour="${href}"]`)) {
    const r = el.getBoundingClientRect();
    if (r.width === 0) continue;
    // Pad around the tab, but keep the whole ring on screen for tabs at the viewport's edge.
    const left = Math.max(2, r.left - 4);
    const top = Math.max(2, r.top - 4);
    return { left, top, width: Math.min(innerWidth - 2, r.right + 4) - left, height: Math.min(innerHeight - 2, r.bottom + 4) - top };
  }
  return null;
}

export function Tour({ autoStartFor }: { autoStartFor: string | null }) {
  const router = useRouter();
  const reduced = useReduced();
  const seenKey = `${SEEN_KEY}:${autoStartFor}`;
  const seen = useSyncExternalStore(subscribeNothing, () => readSeen(seenKey), () => false);
  const [mode, setMode] = useState<Mode | null>(autoStartFor ? "first" : null);
  const [step, setStep] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [cardHeight, setCardHeight] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const active = mode !== null && !(mode === "first" && seen);
  const current = STEPS[step];

  useEffect(() => {
    const replay = () => {
      setStep(0);
      setMode("replay");
    };
    window.addEventListener(TOUR_EVENT, replay);
    return () => window.removeEventListener(TOUR_EVENT, replay);
  }, []);

  const close = useCallback(() => {
    router.replace(mode === "replay" ? "/profile" : "/progress");
    if (mode === "first") {
      try {
        localStorage.setItem(seenKey, "1");
      } catch {
        // Storage blocked: the account flag below still records it.
      }
      void finishTutorial();
    }
    setMode(null);
    setBox(null);
  }, [mode, router, seenKey]);

  // Show each step's real page behind the spotlight.
  useEffect(() => {
    if (active) router.replace(current.href);
  }, [active, current.href, router]);

  // Polled rather than event-driven: nav tabs stream in and move as the page loads.
  useEffect(() => {
    if (!active) return;
    const measure = () => {
      setViewport((v) => (v.width === innerWidth && v.height === innerHeight ? v : { width: innerWidth, height: innerHeight }));
      setCardHeight(cardRef.current?.offsetHeight ?? 0);
      const next = findTab(current.href);
      if (next) setBox((b) => (b && b.left === next.left && b.top === next.top && b.width === next.width && b.height === next.height ? b : next));
    };
    const first = setTimeout(measure, 0);
    const timer = setInterval(measure, 250);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [active, current.href]);

  useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [active]);

  const next = useCallback(() => {
    if (step === STEPS.length - 1) close();
    else setStep(step + 1);
  }, [close, step]);
  const back = useCallback(() => setStep((s) => Math.max(0, s - 1)), []);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") back();
      else if (e.key === "Tab") {
        const buttons = [...(cardRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled)") ?? [])];
        const at = buttons.indexOf(document.activeElement as HTMLElement);
        e.preventDefault();
        buttons[(at + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, back, close, next]);

  const ready = active && box !== null;
  // Back disables itself on the first step, so focus has to move off it.
  const atStart = step === 0;
  useEffect(() => {
    if (ready) cardRef.current?.querySelector<HTMLElement>("[data-tour-next]")?.focus();
  }, [ready, atStart]);

  if (!ready || !box) return null;

  const spring = reduced ? { duration: 0 } : { type: "spring" as const, stiffness: 260, damping: 30 };
  const desktop = viewport.width >= 1024;
  const card = desktop
    ? { left: box.left + box.width + 20, top: Math.min(Math.max(16, box.top + box.height / 2 - cardHeight / 2), viewport.height - cardHeight - 16) }
    : { left: 16, top: Math.max(12, box.top - cardHeight - 14) };

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Absorbs clicks so the page behind can't be used mid-tutorial. */}
      <div className="absolute inset-0" aria-hidden />

      <motion.div
        aria-hidden
        className="pointer-events-none absolute rounded-xl border-2 border-tour"
        style={{ boxShadow: "0 0 0 200vmax rgb(11 11 12 / 0.8)" }}
        initial={false}
        animate={box}
        transition={spring}
      >
        {!reduced && (
          <motion.span
            className="absolute -inset-0.5 rounded-xl border-2 border-tour"
            animate={{ scale: [1, 1.14], opacity: [0.9, 0] }}
            transition={{ duration: 1.3, repeat: Infinity, ease: "easeOut" }}
          />
        )}
      </motion.div>

      <motion.div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-meaning"
        className={cn("absolute rounded-2xl border border-border bg-background p-4", desktop ? "w-[340px]" : "w-[calc(100vw-2rem)] max-w-md")}
        initial={false}
        animate={{ ...card, opacity: cardHeight ? 1 : 0 }}
        transition={spring}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5" role="img" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
            {STEPS.map((s, i) => (
              <span key={s.href} className={cn("h-1.5 rounded-full transition-all", i === step ? "w-5 bg-tour" : i < step ? "w-1.5 bg-foreground" : "w-1.5 bg-surface-highest")} />
            ))}
          </span>
          <button type="button" onClick={close} className="-my-2 -mr-2 h-11 rounded-md px-3 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary">
            Skip
          </button>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={current.href} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.18, ease: EASE }}>
            <div aria-hidden className="mt-3 h-[150px] overflow-hidden rounded-xl border border-hairline">
              <current.Demo />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <h2 id="tour-title" className="text-lg font-bold tracking-[-0.015em]">
                {current.title}
              </h2>
              {current.tags.length > 0 && (
                <span className="flex gap-1.5" aria-hidden>
                  {current.tags.map((tag) => (
                    <span key={tag} className="rounded-md border border-hairline px-2 py-0.5 font-mono text-xs text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </span>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
        <p id="tour-meaning" aria-live="polite" className="sr-only">
          {current.meaning}
        </p>

        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            onClick={back}
            disabled={step === 0}
            className="h-11 flex-1 border-border bg-transparent text-sm font-semibold text-foreground hover:bg-hover dark:border-border dark:bg-transparent dark:hover:bg-hover"
          >
            Back
          </Button>
          <Button data-tour-next onClick={next} className="h-11 flex-1 border-primary bg-primary bg-clip-border text-sm font-semibold text-primary-foreground hover:bg-primary-hover active:bg-primary-pressed">
            {step === STEPS.length - 1 ? "Done" : "Next"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
