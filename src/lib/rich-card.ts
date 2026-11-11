/**
 * What the dense share card prints, built once from a creator's numbers. The same props render
 * the static PNG X shows under a link (lib/og-rich.tsx) and the animated card in the app
 * (components/share/animated-rich-card.tsx), so the two never drift apart. Pure.
 */
import { fmt, fmtCompact, fmtDateShort, fmtPct, fmtSigned } from "./format";
import { GOAL, paceOver, type DayRow } from "./progress";
import type { CardFace, ShareCard, ShareData } from "./share-cards";

export type Racer = { handle: string; avatarUrl: string | null };
export type RichIcon = "flame" | "up" | "trophy" | "chart" | "flag";

export type RichCardProps = {
  /** Short caps headline, e.g. "MY RACE TO 500K". */
  headline: string;
  handle: string;
  avatarUrl: string | null;
  /** "NOV 11": the day the numbers are from. */
  dateLabel: string;
  hero: string;
  heroUnit: string;
  /** Three icon stats beside the hero. */
  lines: { icon: RichIcon; value: string; label: string }[];
  /** Four stat chips under the hero. */
  chips: { value: string; label: string }[];
  visual?: CardFace["visual"];
  /** Creators nearest on the leaderboard ("Racing with"). */
  racers: Racer[];
  /** How many creators are racing (for the panel's footer). */
  racing: number;
  site: string;
};

const HEADLINES: Record<ShareCard["kind"], string> = {
  progress: "My race to 500K",
  target: "My 500K target",
  streak: "Logging streak",
  rank: "Leaderboard rank",
  gain: "My best day",
  milestone: "Milestone unlocked",
};

function bestDay(rows: DayRow[]) {
  return rows.reduce<DayRow | null>((b, r) => (r.delta != null && (!b || r.delta > (b.delta ?? 0)) ? r : b), null);
}

/** `null` when the card is locked or has no face to draw. */
export function buildRichCard(card: ShareCard, d: ShareData, site: string): RichCardProps | null {
  const face = card.face;
  if (!card.available || !face || !d.latest) return null;

  const total = d.latest.total;
  const finished = total >= GOAL;
  const pace7 = paceOver(d.rows, 7);
  const best = bestDay(d.rows);
  const gain = d.latest.delta;

  // Icon stats: skip the one the hero already shows.
  const linePool: (RichCardProps["lines"][number] & { kind: ShareCard["kind"] })[] = [
    { kind: "progress", icon: "chart", value: fmtCompact(total), label: "impressions" },
    { kind: "streak", icon: "flame", value: `${d.streak}-day`, label: "streak" },
    { kind: "gain", icon: "up", value: gain != null ? `+${fmtCompact(Math.max(0, gain))}` : "—", label: "latest day" },
    finished
      ? { kind: "rank", icon: "flag", value: "Done", label: "race finished" }
      : { kind: "rank", icon: "trophy", value: d.rank ? `#${d.rank.rank}` : "—", label: d.rank ? `of ${fmt(d.rank.of)} racing` : "on the board" },
  ];
  const lines = linePool.filter((l) => l.kind !== card.kind).slice(0, 3).map(({ icon, value, label }) => ({ icon, value, label }));

  const chips = [
    { value: fmtSigned(pace7), label: "per day · 7d" },
    { value: fmtPct(Math.min((total / GOAL) * 100, 100)), label: "of 500K" },
    { value: best?.delta != null ? `+${fmtCompact(best.delta)}` : "—", label: "best day" },
    { value: finished ? "Done" : d.eta ? fmtDateShort(d.eta.etaDate) : "—", label: finished ? "500K reached" : "500K by" },
  ];

  const isRankFinished = card.kind === "rank" && finished;
  return {
    headline: (isRankFinished ? "Race finished" : card.kind === "gain" ? face.label : HEADLINES[card.kind]).toUpperCase(),
    handle: d.handle,
    avatarUrl: d.avatarUrl ?? null,
    dateLabel: fmtDateShort(d.latest.date).toUpperCase(),
    hero: face.hero,
    heroUnit: (face.unit ?? face.sub).toUpperCase(),
    lines,
    chips,
    visual: face.visual,
    racers: d.racers ?? [],
    racing: d.racing ?? d.rank?.of ?? 0,
    site,
  };
}
