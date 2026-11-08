"use client";

import { useEffect } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { BellRing, Check } from "lucide-react";
import { useReduced } from "@/components/landing/motion-bits";

type Frames = Record<string, (number | string)[]>;

/** Loops keyframes while the step is on screen; with reduced motion, jumps to the final frame. */
function useLoop(duration = 3.4) {
  const reduced = useReduced();
  return (frames: Frames, times: number[]) =>
    reduced
      ? {
          animate: Object.fromEntries(Object.entries(frames).map(([k, v]) => [k, v[v.length - 1]])),
          transition: { duration: 0 },
        }
      : {
          initial: Object.fromEntries(Object.entries(frames).map(([k, v]) => [k, v[0]])),
          animate: frames,
          transition: { duration, times, repeat: Infinity, repeatDelay: 0.9, ease: "easeOut" as const },
        };
}

const Track = ({ children }: { children?: React.ReactNode }) => (
  <div className="relative h-1.5 overflow-hidden rounded-full bg-surface-highest">{children}</div>
);

export function LogDemo() {
  const loop = useLoop();
  return (
    <div className="flex h-full flex-col justify-center gap-4 px-4">
      <div className="flex items-center justify-between gap-3 rounded-lg border-2 border-tour px-3 py-2">
        <motion.span className="font-mono text-xl font-semibold tabular-nums" {...loop({ clipPath: ["inset(0 100% 0 0)", "inset(0 0% 0 0)", "inset(0 0% 0 0)"] }, [0, 0.45, 1])}>
          28,400
        </motion.span>
        <motion.span className="rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground" {...loop({ scale: [1, 1, 0.86, 1, 1] }, [0, 0.52, 0.58, 0.66, 1])}>
          Save
        </motion.span>
      </div>
      <Track>
        <motion.div className="h-full bg-primary" {...loop({ width: ["0%", "0%", "42%", "42%"] }, [0, 0.62, 0.86, 1])} />
      </Track>
    </div>
  );
}

export function OverviewDemo() {
  const reduced = useReduced();
  const loop = useLoop();
  const value = useMotionValue(146_444);
  const text = useTransform(value, (v) => Math.round(v).toLocaleString("en-US"));

  useEffect(() => {
    if (reduced) return;
    const controls = animate(value, [0, 146_444], { duration: 2.2, ease: "easeOut", repeat: Infinity, repeatType: "loop", repeatDelay: 2.1 });
    return () => controls.stop();
  }, [reduced, value]);

  return (
    <div className="flex h-full flex-col justify-center gap-3 px-4">
      <motion.span className="font-mono text-3xl font-semibold tracking-[-0.03em] tabular-nums">{text}</motion.span>
      <Track>
        <motion.div className="h-full bg-primary" {...loop({ width: ["0%", "29%", "29%"] }, [0, 0.5, 1])} />
      </Track>
      <div className="flex justify-end">
        <motion.span
          className="rounded-md border-2 border-tour px-2 py-0.5 font-mono text-xs font-semibold"
          {...loop({ opacity: [0, 0, 1, 1], scale: [0.7, 0.7, 1, 1] }, [0, 0.52, 0.66, 1])}
        >
          500K est.
        </motion.span>
      </div>
    </div>
  );
}

const CHART = "M8 74 L44 66 L80 58 L116 44 L152 36 L188 20";

export function AnalyticsDemo() {
  const loop = useLoop();
  return (
    <svg viewBox="0 0 200 90" className="h-full w-full px-3 py-2" fill="none">
      {[20, 45, 70].map((y) => (
        <line key={y} x1="0" x2="200" y1={y} y2={y} className="stroke-hairline" />
      ))}
      <motion.path d={CHART} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="stroke-primary" {...loop({ pathLength: [0, 1, 1] }, [0, 0.62, 1])} />
      <motion.circle cx="188" cy="20" r="5.5" strokeWidth="3" className="fill-background stroke-tour" {...loop({ opacity: [0, 0, 1, 1] }, [0, 0.6, 0.68, 1])} />
    </svg>
  );
}

const ROW = 38;

function BoardRow({ frames, you, width }: { frames: number[]; you?: boolean; width: string }) {
  const loop = useLoop();
  return (
    <motion.div
      className={`absolute inset-x-3 flex h-8 items-center gap-2.5 rounded-lg border-2 px-2.5 ${you ? "z-10 border-tour bg-background" : "border-transparent"}`}
      {...loop({ y: frames }, [0, 0.35, 0.65, 1])}
    >
      <span className="flex-1">
        <span className="block h-1.5 rounded-full bg-foreground/60" style={{ width }} />
      </span>
      {you && <span className="rounded-full bg-foreground px-1.5 text-xs font-semibold text-background">You</span>}
    </motion.div>
  );
}

export function LeaderboardDemo() {
  return (
    <div className="relative h-full py-3">
      <BoardRow you width="74%" frames={[ROW * 2, ROW * 2, 0, 0]} />
      <BoardRow width="62%" frames={[0, 0, ROW, ROW]} />
      <BoardRow width="48%" frames={[ROW, ROW, ROW * 2, ROW * 2]} />
    </div>
  );
}

export function ShareDemo() {
  const loop = useLoop();
  return (
    <div className="flex h-full items-center justify-center gap-6 px-4">
      <div className="grid grid-cols-3 gap-1.5">
        <span className="h-16 w-10 rounded-md border border-border" />
        <motion.span
          className="z-10 flex h-16 w-10 items-end rounded-md border-2 border-tour bg-background p-1"
          {...loop({ x: [0, 0, 130, 130, 0, 0], y: [0, -6, 0, 0, 0, 0], scale: [1, 1.1, 0.55, 0.55, 1, 1], opacity: [1, 1, 1, 0, 0, 1] }, [0, 0.3, 0.68, 0.76, 0.77, 1])}
        >
          <span className="h-1 w-full rounded-full bg-primary" />
        </motion.span>
        <span className="h-16 w-10 rounded-md border border-border" />
      </div>
      <motion.span className="shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground" {...loop({ scale: [1, 1, 1.14, 1, 1] }, [0, 0.66, 0.74, 0.84, 1])}>
        Post on X
      </motion.span>
    </div>
  );
}

export function ConnectDemo() {
  const loop = useLoop();
  return (
    <div className="flex h-full flex-col justify-center gap-2 px-4">
      <motion.span className="flex size-8 items-center justify-center self-start rounded-full border-2 border-tour" {...loop({ rotate: [0, -14, 14, -8, 0, 0] }, [0, 0.06, 0.12, 0.18, 0.24, 1])}>
        <BellRing className="size-4" aria-hidden />
      </motion.span>
      <motion.span className="self-end rounded-xl rounded-br-sm bg-primary px-3 py-1 font-mono text-sm font-semibold text-primary-foreground tabular-nums" {...loop({ opacity: [0, 0, 1, 1], y: [10, 10, 0, 0] }, [0, 0.28, 0.4, 1])}>
        28,400
      </motion.span>
      <motion.span className="flex items-center gap-1.5 self-start rounded-xl rounded-bl-sm border border-border px-3 py-1 text-sm font-semibold" {...loop({ opacity: [0, 0, 1, 1], y: [10, 10, 0, 0] }, [0, 0.58, 0.7, 1])}>
        <Check className="size-3.5 text-primary" strokeWidth={3} aria-hidden /> Saved
      </motion.span>
    </div>
  );
}
