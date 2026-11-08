"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { motion, useMotionTemplate, useScroll, useTransform } from "motion/react";
import { useReduced } from "./motion-bits";

const VALUES = [0, 125_000, 250_000, 375_000, 500_000];
const label = (v: number) => (v >= 500_000 ? "500K" : v < 500 ? "0" : `${Math.round(v / 1000)}K`);

/** Where the milestones sit: as scroll progress, and as a fraction of the line's length. */
type Stops = { scroll: number[]; line: number[] };
const EVEN: Stops = { scroll: [0, 0.25, 0.5, 0.75, 1], line: [0, 0.25, 0.5, 0.75, 1] };

/**
 * The page's one idea: a line that fills from 0 to 500K as you scroll. Each milestone is measured
 * so the line and the counter reach exactly 125K, 250K and 375K as that section meets mid-screen.
 */
export function RaceTrack({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [stops, setStops] = useState<Stops>(EVEN);
  const reduced = useReduced();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end center"] });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const box = el.getBoundingClientRect();
      const half = window.innerHeight / 2;
      const span = box.height - half;
      const tops = [...el.querySelectorAll<HTMLElement>("[data-stop]")].map((s) => s.getBoundingClientRect().top - box.top);
      setStops({
        scroll: [0, ...tops.map((t) => Math.max(0.001, (t - half) / span)), 1],
        line: [0, ...tops.map((t) => t / box.height), 1],
      });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const fill = useTransform(scrollYProgress, stops.scroll, stops.line);
  const value = useTransform(scrollYProgress, stops.scroll, VALUES);
  const text = useTransform(value, label);
  const top = useMotionTemplate`max(${useTransform(fill, (f) => f * 100)}%, 6rem)`;
  const pillOpacity = useTransform(scrollYProgress, [0.97, 1], [1, 0]);

  return (
    <div
      ref={ref}
      className="relative mx-auto max-w-[1320px] pr-5 pl-[var(--pad)] [--pad:2.75rem] [--rail:1rem] sm:pr-8 lg:pr-12 lg:[--pad:7rem] lg:[--rail:2.75rem]"
    >
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-[var(--rail)] w-0.5 -translate-x-1/2 bg-surface-highest">
        <motion.div style={{ scaleY: reduced ? 1 : fill }} className="h-full origin-top bg-primary" />
        {!reduced && (
          <motion.span
            style={{ top }}
            className="absolute left-3 hidden -translate-y-1/2 rounded-md bg-primary px-1.5 py-0.5 font-mono text-xs font-semibold text-primary-foreground tabular-nums lg:block"
          >
            {text}
          </motion.span>
        )}
      </div>

      {children}

      {!reduced && (
        <motion.div aria-hidden style={{ opacity: pillOpacity }} className="pointer-events-none fixed inset-x-0 top-16 z-20 flex h-8 items-center justify-center border-b border-hairline bg-background lg:hidden">
          <div className="flex items-baseline gap-1.5">
            <motion.span className="font-mono text-sm font-semibold text-primary tabular-nums">{text}</motion.span>
            <span className="font-mono text-xs text-subtle">/ 500K</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

/** A marker on the line. Lights up once its section has reached the middle of the screen. */
export function Stop({ value }: { value: string }) {
  return (
    <div data-stop aria-hidden className="absolute top-0 left-[calc(var(--rail)-var(--pad))] -translate-x-1/2">
      <motion.span
        className="block size-3.5 rounded-full border-2 border-surface-highest bg-background"
        whileInView={{ backgroundColor: "#c8f432", borderColor: "#c8f432", scale: [1, 1.5, 1] }}
        viewport={{ margin: "100000px 0px -50% 0px" }}
        transition={{ duration: 0.45 }}
      />
      <span className="absolute top-1/2 right-5 hidden -translate-y-1/2 font-mono text-xs text-subtle lg:block">{value}</span>
    </div>
  );
}
