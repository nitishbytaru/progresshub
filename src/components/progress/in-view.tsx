"use client";

import { createContext, useContext, useEffect, useRef, useState, type ComponentProps } from "react";

const InViewContext = createContext(true);

/** True once the nearest <InView> has scrolled into view (always true outside one). */
export const useInView = () => useContext(InViewContext);

/**
 * A <section> that sets data-inview="true" the first time it scrolls into view, so its
 * `.reveal-anim` children start their CSS animations there instead of off-screen on load.
 */
export function InView({ children, ...props }: ComponentProps<"section">) {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return setInView(true);
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <InViewContext.Provider value={inView}>
      <section ref={ref} data-inview={inView} {...props}>
        {children}
      </section>
    </InViewContext.Provider>
  );
}
