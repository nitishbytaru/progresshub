"use client";

import { useEffect, useState } from "react";
import {
  MotionConfig,
  motion,
  useReducedMotion,
  type TargetAndTransition,
} from "motion/react";
import { X } from "lucide-react";
import { Toaster, toast } from "sonner";
import type { Mood } from "@/lib/fit-mascot";
import { Dumbo } from "./dumbo";
import { PlateLoader } from "./plate-loader";

/**
 * Fit toasts: every action answers with Dumbo in a small chalk-on-rubber card. He arrives in a
 * neutral pose, then switches to the toast's mood with a mood-specific entrance (a jump for good
 * news, a droop for a removal, a shake for a surprise), while a thin bar counts the toast down.
 */

export type FitToast = {
  title: string;
  detail?: string;
  mood?: Mood;
  /** Plate or exercise colour for Dumbo's plates and the countdown bar (steel/chalk by default). */
  tint?: string;
  /** Reuse an id to update one toast in place (e.g. "thinking" → result). */
  id?: string;
  duration?: number;
};

const QUEUE_KEY = "fit-toast-next";

const BUSY_ID = "fit-busy";
/** The action in flight: its loader shows only if it runs longer than BUSY_DELAY. */
let busy: { timer: ReturnType<typeof setTimeout>; shown: boolean } | null =
  null;
const BUSY_DELAY = 250;

/**
 * Call when an action starts. If it is still running after a beat, Dumbo shows up thinking with
 * the plate loader; the next fitToast/fitError replaces that loader with the result.
 */
export function fitBusy(label = "Saving…") {
  fitIdle();
  const b = { shown: false, timer: setTimeout(() => {}, 0) };
  b.timer = setTimeout(() => {
    b.shown = true;
    toast.custom(() => <LoaderToast label={label} />, {
      id: BUSY_ID,
      duration: 20000,
    });
  }, BUSY_DELAY);
  busy = b;
}

/** Call when an action ends without a result toast (safe to call always). Returns whether the loader was on screen. */
export function fitIdle(): boolean {
  if (!busy) return false;
  clearTimeout(busy.timer);
  const shown = busy.shown;
  busy = null;
  if (shown) toast.dismiss(BUSY_ID);
  return shown;
}

/** Show a Dumbo toast now (it takes over the loader's slot if one is showing). */
export function fitToast(t: FitToast) {
  const duration = t.duration ?? (t.mood === "thinking" ? Infinity : 3600);
  let id = t.id;
  if (busy) {
    clearTimeout(busy.timer);
    const shown = busy.shown;
    busy = null;
    if (shown) {
      if (id && id !== BUSY_ID) toast.dismiss(BUSY_ID);
      else id = BUSY_ID;
    }
  }
  return toast.custom(
    (tid) => <DumboToast {...t} toastId={tid} duration={duration} />,
    { id, duration },
  );
}

/** Error toast: Dumbo looks sad and says what went wrong. */
export const fitError = (
  detail: string,
  title = "That didn't save",
  id?: string,
) => fitToast({ title, detail, mood: "sad", duration: 5000, id });

/** Show a toast after a full-page navigation (sign in, sign out). */
export function queueFitToast(t: FitToast) {
  try {
    sessionStorage.setItem(QUEUE_KEY, JSON.stringify(t));
  } catch {
    /* storage blocked: skip the toast */
  }
}

/** Drop a queued toast (e.g. the sign-in redirect failed). */
export function clearQueuedFitToast() {
  try {
    sessionStorage.removeItem(QUEUE_KEY);
  } catch {
    /* storage blocked */
  }
}

/** The toaster for both fit layouts; also shows any toast queued before a navigation. */
export function FitToaster() {
  useEffect(() => {
    let queued: string | null = null;
    try {
      queued = sessionStorage.getItem(QUEUE_KEY);
      sessionStorage.removeItem(QUEUE_KEY);
    } catch {
      /* storage blocked */
    }
    if (!queued) return;
    try {
      const t = JSON.parse(queued) as FitToast;
      const timer = setTimeout(() => fitToast(t), 450);
      return () => clearTimeout(timer);
    } catch {
      /* malformed: ignore */
    }
  }, []);

  return (
    <Toaster
      position="bottom-center"
      offset={{ bottom: 24 }}
      mobileOffset={{ bottom: 100 }}
      gap={10}
      visibleToasts={3}
    />
  );
}

/** One-shot entrance per mood, on top of Dumbo's own pose and loop. */
const ENTRANCE: Partial<Record<Mood, TargetAndTransition>> = {
  happy: {
    y: [16, -10, 0],
    scale: [0.7, 1.08, 1],
    transition: { duration: 0.6, ease: [0.2, 1.4, 0.4, 1] },
  },
  flex: {
    y: [16, -14, 0],
    rotate: [0, -8, 8, 0],
    scale: [0.7, 1.12, 1],
    transition: { duration: 0.75 },
  },
  proud: {
    scale: [0.6, 1.15, 1],
    rotate: [-10, 4, 0],
    transition: { duration: 0.6 },
  },
  sad: {
    y: [-6, 6, 3],
    rotate: [0, -6, -3],
    transition: { duration: 0.9, ease: "easeOut" },
  },
  sore: { x: [0, -4, 4, -3, 3, 0], transition: { duration: 0.5, delay: 0.25 } },
  shocked: {
    scale: [0.8, 1.2, 1],
    x: [0, -5, 5, -4, 4, 0],
    transition: { duration: 0.6 },
  },
  sleepy: {
    rotate: [0, -8, -5],
    y: [0, 4, 3],
    transition: { duration: 1.2, ease: "easeInOut" },
  },
  thinking: { rotate: [0, 6, -4, 0], transition: { duration: 0.8 } },
  curious: { rotate: [0, -10, 0], transition: { duration: 0.6 } },
};

function DumboToast({
  title,
  detail,
  mood = "happy",
  tint,
  toastId,
  duration,
}: FitToast & { toastId: string | number; duration: number }) {
  const reduce = useReducedMotion();
  // Arrive curious, then feel it: the pose change is the emotion beat.
  const [face, setFace] = useState<Mood>(reduce ? mood : "curious");
  useEffect(() => {
    if (reduce) return;
    const t = setTimeout(() => setFace(mood), 220);
    return () => clearTimeout(t);
  }, [mood, reduce]);

  const bar = tint ?? "var(--chalk)";
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        role="status"
        aria-live="polite"
        className="relative flex w-[min(92vw,380px)] items-center gap-3 overflow-hidden rounded-2xl border border-outline bg-surface-high p-2.5 pr-10 font-sans text-ink"
        initial={{ opacity: 0, y: 24, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 30 }}
      >
        <span className="grid h-16 w-[4.75rem] shrink-0 place-items-center rounded-xl bg-background pt-1">
          <motion.span
            key={mood}
            className="block"
            animate={reduce ? undefined : ENTRANCE[mood]}
          >
            <Dumbo mood={face} tint={tint} size={68} />
          </motion.span>
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="text-sm leading-snug font-bold">{title}</span>
          {detail && (
            <span className="truncate text-xs text-ink-subtle">{detail}</span>
          )}
        </span>
        <button
          type="button"
          onClick={() => toast.dismiss(toastId)}
          aria-label="Dismiss"
          className="absolute top-1.5 right-1.5 grid size-8 place-items-center rounded-full text-ink-subtle hover:bg-hover hover:text-ink"
        >
          <X className="size-4" aria-hidden />
        </button>
        {Number.isFinite(duration) && (
          <motion.span
            key={`${title}-${detail}`}
            className="absolute bottom-0 left-0 h-[3px] w-full origin-left"
            style={{ background: bar }}
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: duration / 1000, ease: "linear" }}
            aria-hidden
          />
        )}
      </motion.div>
    </MotionConfig>
  );
}

/** The loader toast: Dumbo thinking while three plates keep loading onto the sleeve. */
function LoaderToast({ label }: { label: string }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        role="status"
        aria-live="polite"
        aria-busy
        className="relative flex w-[min(92vw,380px)] items-center gap-3 overflow-hidden rounded-2xl border border-outline bg-surface-high p-2.5 pr-4 font-sans text-ink"
        initial={{ opacity: 0, y: 24, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 30 }}
      >
        <span className="grid h-16 w-[4.75rem] shrink-0 place-items-center rounded-xl bg-background pt-1">
          <Dumbo mood="thinking" size={68} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm leading-snug font-bold">{label}</span>
          <span className="text-xs text-ink-subtle">Loading the bar</span>
        </span>
        <PlateLoader />
      </motion.div>
    </MotionConfig>
  );
}
