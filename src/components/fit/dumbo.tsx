"use client";

import { AnimatePresence, motion, useReducedMotion, type TargetAndTransition, type Transition } from "motion/react";
import type { Mood } from "@/lib/fit-mascot";

/**
 * Dumbo the dumbbell: one SVG character driven by a single `mood` (a small state machine, the way
 * Duolingo-style mascots work). A chunky capsule handle is the body with the face on it; the two
 * bumper plates are his "arms" and swing, flex and droop around their own centres.
 * `tint` colours the plates with the muscle being talked about (steel by default).
 */

type Pose = { body: TargetAndTransition; left: TargetAndTransition; right: TargetAndTransition };

const POSE: Record<Mood, Pose> = {
  idle: { body: { y: 0, rotate: 0, scaleY: 1 }, left: { y: 0, rotate: 0 }, right: { y: 0, rotate: 0 } },
  curious: { body: { y: 0, rotate: -6, scaleY: 1 }, left: { y: -4, rotate: -8 }, right: { y: 2, rotate: 4 } },
  thinking: { body: { y: 0, rotate: 4, scaleY: 1 }, left: { y: 0, rotate: 0 }, right: { y: -10, rotate: 18 } },
  happy: { body: { y: -4, rotate: 0, scaleY: 1.02 }, left: { y: -10, rotate: -16 }, right: { y: -10, rotate: 16 } },
  proud: { body: { y: -2, rotate: 0, scaleY: 1 }, left: { y: 0, rotate: 0 }, right: { y: -26, rotate: 34 } },
  flex: { body: { y: -6, rotate: 0, scaleY: 1.03 }, left: { y: -24, rotate: -32 }, right: { y: -24, rotate: 32 } },
  sad: { body: { y: 8, rotate: 0, scaleY: 0.94 }, left: { y: 10, rotate: 14 }, right: { y: 10, rotate: -14 } },
  sore: { body: { y: 4, rotate: 5, scaleY: 0.97 }, left: { y: 2, rotate: -4 }, right: { y: 12, rotate: 22 } },
  sleepy: { body: { y: 6, rotate: -4, scaleY: 0.96 }, left: { y: 6, rotate: 8 }, right: { y: 6, rotate: -8 } },
  shocked: { body: { y: -8, rotate: 0, scaleY: 1.05 }, left: { y: -14, rotate: -24 }, right: { y: -14, rotate: 24 } },
};

/** Looping life on top of the pose. */
const LOOP: Partial<Record<Mood, { anim: TargetAndTransition; dur: number; delay?: number }>> = {
  idle: { anim: { y: [0, -3, 0] }, dur: 2.6 },
  curious: { anim: { rotate: [-6, -2, -6] }, dur: 2 },
  thinking: { anim: { rotate: [3, -3, 3] }, dur: 1.4 },
  happy: { anim: { y: [-4, -18, -4], scaleY: [1.02, 0.94, 1.06, 1.02] }, dur: 0.75, delay: 0.2 },
  proud: { anim: { y: [-2, -8, -2] }, dur: 1.1 },
  flex: { anim: { y: [-6, -14, -6] }, dur: 0.6 },
  sad: { anim: { y: [8, 10, 8] }, dur: 2.6 },
  sore: { anim: { x: [0, -2.5, 2.5, -1, 0] }, dur: 0.5, delay: 0.6 },
  sleepy: { anim: { y: [6, 9, 6], rotate: [-4, -6, -4] }, dur: 3.2 },
  shocked: { anim: { y: [-8, -14, -8] }, dur: 0.4 },
};

const MOUTH: Partial<Record<Mood, string>> = {
  idle: "M100 101 Q110 108 120 101",
  curious: "M104 103 Q110 106 116 103",
  thinking: "M103 104 L117 101",
  happy: "M97 99 Q110 116 123 99 Z",
  proud: "M99 100 Q110 113 121 100",
  flex: "M96 98 Q110 118 124 98 Z",
  sad: "M100 108 Q110 99 120 108",
  sore: "M99 105 Q104 100 110 105 Q116 110 121 104",
  sleepy: "M105 104 Q110 106 115 104",
};

function Eyes({ mood, blink }: { mood: Mood; blink: boolean }) {
  const ink = "var(--rubber)";
  const arc = (d1: string, d2: string) => (
    <g fill="none" stroke={ink} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round">
      <path d={d1} />
      <path d={d2} />
    </g>
  );
  if (mood === "happy" || mood === "proud" || mood === "flex") return arc("M90 86 Q96 78 102 86", "M118 86 Q124 78 130 86");
  if (mood === "sleepy") return arc("M90 84 Q96 90 102 84", "M118 84 Q124 90 130 84");
  if (mood === "sore") return arc("M90 80 L101 85 L90 90", "M130 80 L119 85 L130 90");
  const big = mood === "shocked";
  const r = big ? 9 : 7.5;
  const px = mood === "curious" ? 2 : mood === "thinking" ? 1 : 0;
  const py = mood === "thinking" ? -3.5 : mood === "sad" ? 2.5 : 0;
  return (
    <g>
      <motion.g animate={{ scaleY: blink ? 0.08 : 1 }} transition={{ duration: 0.07 }} style={{ transformBox: "fill-box", originY: 0.5 }}>
        {[96, 124].map((cx) => (
          <g key={cx}>
            <ellipse cx={cx} cy={85} rx={r} ry={r + 1} fill="var(--chalk)" />
            <motion.circle cx={cx} cy={85} r={big ? 3.4 : 4} fill={ink} animate={{ cx: cx + px, cy: 85 + py }} transition={{ type: "spring", stiffness: 300, damping: 20 }} />
            <circle cx={cx + px + 1.4} cy={83.4 + py} r={1.2} fill="var(--chalk)" />
          </g>
        ))}
      </motion.g>
      {mood === "sad" && (
        <g stroke={ink} strokeWidth={3} strokeLinecap="round">
          <path d="M88 78 L101 72" />
          <path d="M132 78 L119 72" />
        </g>
      )}
      {mood === "thinking" && <path d="M117 73 L131 71" stroke={ink} strokeWidth={3} strokeLinecap="round" />}
    </g>
  );
}

function Plate({ x, tint }: { x: number; tint: string }) {
  return (
    <g>
      <rect x={x} y={38} width={44} height={96} rx={16} fill={tint} />
      <rect x={x} y={38} width={44} height={96} rx={16} fill="none" stroke="#000" strokeOpacity={0.3} strokeWidth={4} />
      <rect x={x + 9} y={50} width={26} height={72} rx={10} fill="none" stroke="#000" strokeOpacity={0.16} strokeWidth={2.5} />
      <rect x={x + 17} y={78} width={10} height={16} rx={4} fill="var(--steel)" stroke="#000" strokeOpacity={0.3} strokeWidth={1.5} />
    </g>
  );
}

export function Dumbo({
  mood,
  tint = "var(--steel)",
  blink = false,
  size = 200,
  className = "",
  outfit,
}: {
  mood: Mood;
  tint?: string;
  blink?: boolean;
  size?: number;
  className?: string;
  /** "coach": a chalk cap and a whistle on a cord (the Coach page). */
  outfit?: "coach";
}) {
  const reduce = useReducedMotion();
  const spring: Transition = reduce ? { duration: 0 } : { type: "spring", stiffness: 240, damping: 15 };
  const pose = POSE[mood];
  const loop = LOOP[mood];
  const mouth = MOUTH[mood];
  const cheeks = mood === "happy" || mood === "flex" || mood === "proud";

  return (
    <motion.svg viewBox="0 0 220 168" width={size} height={size * (168 / 220)} className={`overflow-visible ${className}`} aria-hidden>
      <motion.ellipse cx={110} cy={158} rx={72} ry={6} fill="#000" opacity={0.4} animate={{ rx: mood === "happy" || mood === "flex" || mood === "shocked" ? 56 : 72 }} transition={spring} />
      {/* life loop wraps the pose */}
      <motion.g
        animate={reduce || !loop ? {} : loop.anim}
        transition={reduce || !loop ? undefined : { duration: loop.dur, repeat: Infinity, ease: "easeInOut", repeatDelay: loop.delay ?? 0 }}
        style={{ transformBox: "fill-box", originX: 0.5, originY: 1 }}
      >
        <motion.g animate={pose.body} transition={spring} style={{ transformBox: "fill-box", originX: 0.5, originY: 1 }}>
          {/* plates (arms) behind the body */}
          <motion.g animate={pose.left} transition={spring} style={{ transformBox: "fill-box", originX: 0.8, originY: 0.5 }}>
            <Plate x={18} tint={tint} />
          </motion.g>
          <motion.g animate={pose.right} transition={spring} style={{ transformBox: "fill-box", originX: 0.2, originY: 0.5 }}>
            <Plate x={158} tint={tint} />
          </motion.g>
          {/* collars */}
          <rect x={58} y={68} width={10} height={36} rx={3} fill="var(--steel)" stroke="#000" strokeOpacity={0.25} strokeWidth={1.5} />
          <rect x={152} y={68} width={10} height={36} rx={3} fill="var(--steel)" stroke="#000" strokeOpacity={0.25} strokeWidth={1.5} />
          {/* body: chunky capsule handle with knurl */}
          <rect x={64} y={58} width={92} height={58} rx={29} fill="var(--steel)" />
          <rect x={64} y={58} width={92} height={58} rx={29} fill="none" stroke="#000" strokeOpacity={0.22} strokeWidth={3} />
          <g stroke="#000" strokeOpacity={0.12} strokeWidth={2}>
            {[78, 86, 134, 142].map((x) => (
              <line key={x} x1={x} y1={64} x2={x} y2={110} />
            ))}
          </g>
          <ellipse cx={110} cy={66} rx={30} ry={4} fill="#fff" opacity={0.16} />
          {/* face */}
          <Eyes mood={mood} blink={blink} />
          {mood === "shocked" ? (
            <motion.ellipse cx={110} cy={104} rx={6} ry={7.5} fill="var(--rubber)" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring} />
          ) : (
            mouth && <motion.path d={mouth} animate={{ d: mouth }} transition={spring} fill={mouth.endsWith("Z") ? "var(--rubber)" : "none"} stroke="var(--rubber)" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
          )}
          {cheeks && (
            <>
              <ellipse cx={86} cy={98} rx={6} ry={3.2} fill="var(--chalk)" opacity={0.35} />
              <ellipse cx={134} cy={98} rx={6} ry={3.2} fill="var(--chalk)" opacity={0.35} />
            </>
          )}
          {outfit === "coach" && (
            <g>
              {/* Coach cap: crown, band and a brim pointing forward. */}
              <path d="M78 67 C78 36 142 36 142 67 Z" fill="var(--chalk)" stroke="#000" strokeOpacity={0.25} strokeWidth={2} />
              <path d="M84 50 C96 44 124 44 136 50" fill="none" stroke="#000" strokeOpacity={0.12} strokeWidth={2} />
              <path d="M136 63 Q168 59 174 68 Q154 72 136 69 Z" fill="var(--chalk)" stroke="#000" strokeOpacity={0.25} strokeWidth={2} />
              <rect x={78} y={62} width={64} height={6} rx={3} fill="var(--rubber)" opacity={0.85} />
              <circle cx={110} cy={39} r={3.2} fill="var(--rubber)" opacity={0.85} />
              {/* Whistle on a cord. */}
              <path d="M86 108 Q110 128 134 108" fill="none" stroke="var(--chalk)" strokeWidth={2} strokeLinecap="round" opacity={0.9} />
              <rect x={101} y={117} width={17} height={10} rx={5} fill="var(--chalk)" stroke="#000" strokeOpacity={0.3} strokeWidth={1.5} />
              <rect x={116} y={119} width={9} height={5} rx={2} fill="var(--chalk)" stroke="#000" strokeOpacity={0.3} strokeWidth={1.5} />
              <circle cx={107} cy={122} r={2} fill="var(--rubber)" opacity={0.7} />
            </g>
          )}
        </motion.g>
      </motion.g>

      {/* effects */}
      <AnimatePresence>
        {cheeks && !reduce && (
          <motion.g key="spark" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {[
              [20, 26, 0],
              [200, 22, 0.25],
              [110, 10, 0.5],
              [182, 60, 0.75],
            ].map(([x, y, d], i) => (
              <motion.path
                key={i}
                d={`M${x} ${y - 7} L${x + 2} ${y - 2} L${x + 7} ${y} L${x + 2} ${y + 2} L${x} ${y + 7} L${x - 2} ${y + 2} L${x - 7} ${y} L${x - 2} ${y - 2} Z`}
                fill="var(--chalk)"
                animate={{ scale: [0, 1.2, 0], rotate: [0, 90] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: d, repeatDelay: 0.5 }}
                style={{ transformBox: "fill-box", originX: 0.5, originY: 0.5 }}
              />
            ))}
          </motion.g>
        )}
        {mood === "sad" && !reduce && (
          <motion.path key="tear" d="M131 92 Q135 99 131 102 Q127 99 131 92 Z" fill="var(--chalk-variant)" initial={{ y: 0, opacity: 0 }} animate={{ y: [0, 30], opacity: [0, 1, 0] }} transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 0.6 }} />
        )}
        {mood === "sore" && !reduce && (
          <motion.path key="sweat" d="M146 50 Q152 60 146 64 Q140 60 146 50 Z" fill="var(--chalk-variant)" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0], y: [0, 5, 12] }} transition={{ duration: 1.3, repeat: Infinity }} />
        )}
        {mood === "sleepy" && !reduce && (
          <motion.g key="z" fill="var(--chalk-variant)" style={{ fontFamily: "var(--font-barlow)", fontWeight: 800 }}>
            {[0, 1].map((i) => (
              <motion.text key={i} x={170} y={44} fontSize={20 - i * 5} initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0], x: [168, 184], y: [46, 12] }} transition={{ duration: 2.2, repeat: Infinity, delay: i * 1 }}>
                z
              </motion.text>
            ))}
          </motion.g>
        )}
        {mood === "thinking" && !reduce && (
          <motion.g key="dots" fill="var(--chalk-variant)">
            {[0, 1, 2].map((i) => (
              <motion.circle key={i} cx={176 + i * 11} cy={34 - i * 7} r={3 + i * 1.2} animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
            ))}
          </motion.g>
        )}
      </AnimatePresence>
    </motion.svg>
  );
}
