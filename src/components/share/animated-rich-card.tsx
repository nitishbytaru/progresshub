"use client";

import { useEffect, useRef, useState } from "react";
import type { RichCardProps } from "@/lib/rich-card";
import { RichCard } from "./rich-card";

const W = 1200;
const H = 630;
const FONTS = { sans: "var(--font-jakarta), sans-serif", mono: "var(--font-jetbrains), monospace" };

/**
 * The in-app share card: the same markup as the PNG X shows, scaled to fit its tile and animated
 * (builds up, holds, replays every 7s). Static when the viewer prefers reduced motion.
 */
export function AnimatedRichCard({ p, label, className }: { p: RichCardProps; label: string; className?: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const fit = () => setScale(box.clientWidth / W);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={boxRef} role="img" aria-label={label} className={`relative aspect-[1200/630] w-full overflow-hidden ${className ?? ""}`}>
      {scale > 0 && (
        <div aria-hidden className="absolute top-0 left-0 origin-top-left" style={{ width: W, height: H, transform: `scale(${scale})` }}>
          <RichCard p={p} fonts={FONTS} animated />
        </div>
      )}
    </div>
  );
}
