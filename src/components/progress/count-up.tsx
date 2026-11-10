"use client";

import { useEffect, useRef } from "react";
import { fmt, fmtCompact } from "@/lib/format";
import { useInView } from "./in-view";

/**
 * A number that counts up from 0 when its <InView> card scrolls into view.
 * Server render and reduced motion both show the final value. Frames write the text
 * straight to the DOM, so the count never re-renders React.
 */
export function CountUp({
  value,
  compact = false,
  duration = 900,
  delay = 0,
}: {
  value: number;
  compact?: boolean;
  duration?: number;
  delay?: number;
}) {
  const inView = useInView();
  const ref = useRef<HTMLSpanElement>(null);
  const format = (n: number) => (compact ? fmtCompact(Math.round(n)) : fmt(n));
  const final = format(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || !inView || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let start = 0;
    const tick = (t: number) => {
      if (!start) start = t + delay;
      const p = Math.min(Math.max((t - start) / duration, 0), 1);
      el.textContent = p < 1 ? format(value * (1 - Math.pow(2, -10 * p))) : final; // ease-out-expo
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    el.textContent = format(0);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      el.textContent = final;
    };
    // format is derived from `compact`, which is in the list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, value, compact, duration, delay, final]);

  return (
    <span ref={ref} className="tabular-nums">
      {final}
    </span>
  );
}
