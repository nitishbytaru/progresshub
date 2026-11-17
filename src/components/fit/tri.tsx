/**
 * A coloured ▲/▼ for a change (the number beside it stays chalk). Same rule everywhere in fit, the
 * weight trend's dots included: toward your goal = green, away = coral; with no direction to aim
 * for, down = blue and up = violet; no real change = steel. Colours from the --viz-* tokens.
 */
export type GoalDir = -1 | 0 | 1;

/** lose → down is good, gain → up is good, maintain / unknown → no judgement. */
export const goalDir = (goal: string | null | undefined): GoalDir => (goal === "lose" ? -1 : goal === "gain" ? 1 : 0);

export function toneColor(d: number, dir: GoalDir, eps = 0.05) {
  if (Math.abs(d) < eps) return "var(--steel)";
  if (!dir) return d < 0 ? "var(--viz-line)" : "var(--viz-violet)";
  return Math.sign(d) === dir ? "var(--viz-good)" : "var(--viz-bad)";
}

export function Tri({ d, dir, eps }: { d: number; dir: GoalDir; eps?: number }) {
  if (!d) return null;
  return (
    <span style={{ color: toneColor(d, dir, eps) }} aria-hidden>
      {d > 0 ? "▲" : "▼"}
    </span>
  );
}
