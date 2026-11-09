"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import Image from "next/image";
import { animate, motion, MotionConfig, useInView, useMotionValue, useScroll, useSpring, useTransform } from "motion/react";
import { BrandMark } from "@/components/shell/brand";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (onChange: () => void) => {
  const query = window.matchMedia(REDUCE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

/** The visitor's reduced-motion setting, always false on the first render so hydration matches. */
export const useReduced = () => useSyncExternalStore(subscribeReduced, () => window.matchMedia(REDUCE_QUERY).matches, () => false);

/** Honours the visitor's reduced-motion setting everywhere below it. */
export function MotionRoot({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      data-reveal
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.8, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

type ShotProps = { name: "overview" | "progress" | "leaderboard"; alt: string; priority?: boolean; cropClass?: string };

/** A real app screenshot in a flat browser frame; the phone capture replaces it on small screens. */
export function ScreenFrame({ name, alt, priority, cropClass }: ShotProps) {
  return (
    <figure className="overflow-hidden rounded-2xl border border-border bg-background">
      <div className="flex h-9 items-center gap-1.5 border-b border-hairline px-4" aria-hidden>
        <span className="size-2 rounded-full bg-surface-highest" />
        <span className="size-2 rounded-full bg-surface-highest" />
        <span className="size-2 rounded-full bg-surface-highest" />
        <BrandMark className="ml-3 size-4" />
        <span className="ml-0.5 font-mono text-xs text-subtle">progresshub</span>
      </div>
      <Image src={`/landing/${name}-mobile.png`} alt={alt} width={780} height={1688} priority={priority} sizes="100vw" className="block h-auto w-full md:hidden" />
      <div className={cn("hidden overflow-hidden md:block", cropClass)}>
        <Image src={`/landing/${name}.png`} alt={alt} width={2880} height={1800} priority={priority} sizes="(min-width: 1280px) 1100px, 90vw" className="block h-auto w-full" />
      </div>
    </figure>
  );
}

/** The hero screenshot: tilted back at first, settling flat as you scroll. */
export function HeroScreen(props: ShotProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReduced();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 95%", "start 25%"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });
  const rotateX = useTransform(smooth, [0, 1], [reduced ? 0 : 20, 0]);
  const scale = useTransform(smooth, [0, 1], [reduced ? 1 : 0.92, 1]);

  return (
    <div ref={ref} style={{ perspective: 1400 }}>
      <motion.div style={{ rotateX, scale, transformOrigin: "50% 0%" }}>
        <ScreenFrame {...props} />
      </motion.div>
    </div>
  );
}

/** Wipes a screenshot in from the top, like rows landing on a board. */
export function WipeIn({ children }: { children: ReactNode }) {
  return (
    <motion.div
      data-reveal
      initial={{ clipPath: "inset(0 0 100% 0)" }}
      whileInView={{ clipPath: "inset(0 0 0% 0)" }}
      viewport={{ once: true, margin: "0px 0px -15% 0px" }}
      transition={{ duration: 1.2, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** Shows the real value by default, then counts up to it when scrolled into view. */
export function CountUp({ to, prefix = "", className }: { to: number; prefix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const reduced = useReduced();
  const value = useMotionValue(to);
  const text = useTransform(value, (v) => `${prefix}${Math.round(v).toLocaleString("en-US")}`);

  useEffect(() => {
    if (!inView || reduced) return;
    const controls = animate(value, [0, to], { duration: 1.6, ease: EASE });
    return () => controls.stop();
  }, [inView, reduced, to, value]);

  return (
    <motion.span ref={ref} className={cn("tabular-nums", className)}>
      {text}
    </motion.span>
  );
}

const TYPED = "146,444";

/** A miniature of the log box: the number types itself in, then saves. */
export function TypedLog() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -15% 0px" });
  const reduced = useReduced();
  const [typed, setTyped] = useState(TYPED.length);
  const done = typed === TYPED.length;

  useEffect(() => {
    if (!inView || reduced) return;
    let i = 0;
    const timer = setInterval(() => {
      setTyped(i);
      if (i++ >= TYPED.length) clearInterval(timer);
    }, 130);
    return () => clearInterval(timer);
  }, [inView, reduced]);

  return (
    <div ref={ref} className="rounded-xl border border-border p-4" role="img" aria-label="Typing 146,444 into the log box, then saving it">
      <div className="flex items-center justify-between gap-3" aria-hidden>
        <span className="font-mono text-3xl font-semibold tracking-[-0.03em] tabular-nums">
          {TYPED.slice(0, typed)}
          {!done && <span className="ml-0.5 inline-block h-7 w-0.5 translate-y-1 animate-pulse bg-primary" />}
        </span>
        <motion.span
          animate={{ opacity: done ? 1 : 0, scale: done ? 1 : 0.8 }}
          transition={{ duration: 0.35, ease: EASE }}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground"
        >
          Saved
        </motion.span>
      </div>
    </div>
  );
}
