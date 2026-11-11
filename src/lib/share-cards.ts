/**
 * Every stat a creator can share on X, in one place: what the card says, the post text,
 * the preview image and the public link. Pure, so the in-app Share page, the public page's
 * metadata and the image route all agree. Each post links back to progresshub.
 */
import { fmt, fmtCompact, fmtDate, fmtPct, fmtSigned } from "./format";
import { addDays, GOAL, isValidTarget, MILESTONES, targetPlan, type DayRow, type Forecast } from "./progress";

export const SHARE_KINDS = ["progress", "target", "streak", "rank", "gain", "milestone"] as const;
export type ShareKind = (typeof SHARE_KINDS)[number];
/** Kinds drawn by /u/[handle]/share/[kind]; progress and target keep their own image routes. */
export const IMAGE_KINDS = ["streak", "rank", "gain", "milestone"] as const;
export type ImageKind = (typeof IMAGE_KINDS)[number];

export const isShareKind = (v: unknown): v is ShareKind => SHARE_KINDS.includes(v as ShareKind);
export const isImageKind = (v: unknown): v is ImageKind => IMAGE_KINDS.includes(v as ImageKind);

export type ShareData = {
  handle: string;
  rows: DayRow[];
  latest: DayRow | null;
  streak: number;
  rank: { rank: number; of: number } | null;
  eta: Forecast;
  today: string;
};

/** What the image shows: a label, one big number, one line under it, and an optional visual. */
export type CardFace = {
  label: string;
  hero: string;
  unit?: string;
  sub: string;
  visual?:
    | { type: "days"; days: { date: string; logged: boolean }[] }
    | { type: "bar"; pct: number; left: string; right: string }
    | { type: "compare"; a: { label: string; value: number }; b: { label: string; value: number } };
};

export type ShareCard = {
  kind: ShareKind;
  /** 1–2 word name on the Share page. */
  name: string;
  available: boolean;
  /** Tiny tag on a locked card: what unlocks it. */
  lock?: string;
  title: string;
  description: string;
  postText: string;
  /** Relative paths; prefix with the site origin for X. */
  imagePath: string;
  sharePath: string;
  face?: CardFace;
};

/** Changes whenever anything printed on any card changes, so X never shows a stale preview. */
export function shareVersion(d: Pick<ShareData, "latest" | "streak" | "rank">) {
  return [d.latest?.date ?? "none", d.latest?.total ?? 0, d.streak, d.rank?.rank ?? 0, d.rank?.of ?? 0].join("-");
}

const STRIP_DAYS = 14;

/** Every milestone passed so far, oldest first, with the first day the total reached it. */
export function reachedMilestones(rows: DayRow[]): { target: number; date: string }[] {
  return MILESTONES.flatMap((target) => {
    const hit = rows.find((r) => r.total >= target);
    return hit ? [{ target, date: hit.date }] : [];
  });
}

export function buildShareCard(
  kind: ShareKind,
  d: ShareData,
  opts: { target?: string; milestone?: number } = {},
): ShareCard {
  const h = d.handle;
  const v = encodeURIComponent(shareVersion(d));
  const total = d.latest?.total ?? 0;
  const pct = Math.min((total / GOAL) * 100, 100);
  const sign = `Racing to 500K on progresshub as @${h}.`;
  const imageKindPath = (k: ImageKind) => `/u/${h}/share/${k}?v=${v}`;
  const shareKindPath = (k: ShareKind) => `/u/${h}?share=${k}&v=${v}`;
  const locked = (name: string, lock: string): ShareCard => ({
    kind,
    name,
    available: false,
    lock,
    title: "",
    description: "",
    postText: "",
    imagePath: "",
    sharePath: "",
  });

  switch (kind) {
    case "progress": {
      if (!d.latest) return locked("Progress", "log your first day");
      return {
        kind,
        name: "Progress",
        available: true,
        title: `@${h} on the road to 500K`,
        description: `${fmt(total)} / 500,000 impressions on X (${fmtPct(pct)}).`,
        postText: [
          `I'm at ${fmt(total)} / 500,000 impressions on X (${fmtPct(pct)}).`,
          d.latest.delta != null ? `Latest day: ${fmtSigned(d.latest.delta)}.` : null,
          sign,
        ]
          .filter(Boolean)
          .join("\n"),
        imagePath: `/u/${h}/card?v=${v}`,
        sharePath: `/u/${h}?v=${v}`,
      };
    }

    case "target": {
      const target = opts.target ?? `${d.today.slice(0, 4)}-12-31`;
      if (!d.latest || !isValidTarget(target, d.latest.date)) return locked("Target", "log your first day");
      const plan = targetPlan(total, d.latest.date, target);
      if (plan.remaining === 0) return locked("Target", "500K reached");
      const tv = encodeURIComponent(`${d.latest.date}-${d.latest.total}`);
      return {
        kind,
        name: "Target",
        available: true,
        title: `@${h}'s 500K target: ${fmtDate(target)}`,
        description: `${fmtSigned(plan.perDay)}/day to reach 500K impressions on X by ${fmtDate(target)}.`,
        postText: [
          `My target: 500K impressions on X by ${fmtDate(target)}.`,
          `That's ${fmtSigned(plan.perDay)}/day, ${fmt(plan.remaining)} to go in ${plan.days} days.`,
          sign,
        ].join("\n"),
        imagePath: `/u/${h}/target-card?d=${target}&v=${tv}`,
        sharePath: `/u/${h}?target=${target}&v=${tv}`,
      };
    }

    case "streak": {
      if (d.streak < 2) return locked("Streak", "log 2 days in a row");
      const logged = new Set(d.rows.map((r) => r.date));
      const days = Array.from({ length: STRIP_DAYS }, (_, i) => addDays(d.today, i - STRIP_DAYS + 1)).map((date) => ({
        date,
        logged: logged.has(date),
      }));
      return {
        kind,
        name: "Streak",
        available: true,
        title: `@${h}: ${d.streak}-day logging streak`,
        description: `${d.streak} days in a row of logging X impressions on the way to 500K.`,
        postText: [`${d.streak} days in a row logging my X impressions.`, sign].join("\n"),
        imagePath: imageKindPath("streak"),
        sharePath: shareKindPath("streak"),
        face: {
          label: "Logging streak",
          hero: String(d.streak),
          unit: d.streak === 1 ? "day" : "days",
          sub: "in a row, no days missed",
          visual: { type: "days", days },
        },
      };
    }

    case "rank": {
      // At 500K the race is finished: no place on the board, a finish card instead.
      if (d.latest && total >= GOAL) {
        return {
          kind,
          name: "Rank",
          available: true,
          title: `@${h} finished the race to 500K on progresshub`,
          description: `Race finished: ${fmt(total)} impressions on X, past the 500K line.`,
          postText: [`Race finished 🏁`, `${fmt(total)} impressions on X, past the 500K line.`, `Join the race on progresshub.`].join("\n"),
          imagePath: imageKindPath("rank"),
          sharePath: shareKindPath("rank"),
          face: {
            label: "Race to 500K",
            hero: "Finished",
            sub: `${fmt(total)} impressions`,
            visual: { type: "bar", pct: 100, left: "500K reached", right: "done" },
          },
        };
      }
      if (!d.rank || !d.latest) return locked("Rank", "log a day to join the board");
      return {
        kind,
        name: "Rank",
        available: true,
        title: `@${h} is #${d.rank.rank} of ${d.rank.of} on progresshub`,
        description: `Ranked #${d.rank.rank} of ${d.rank.of} creators racing to 500K impressions on X.`,
        postText: [
          `Ranked #${d.rank.rank} of ${d.rank.of} creators racing to 500K impressions on X.`,
          `${fmt(total)} so far (${fmtPct(pct)}).`,
          `Join the race on progresshub.`,
        ].join("\n"),
        imagePath: imageKindPath("rank"),
        sharePath: shareKindPath("rank"),
        face: {
          label: "Leaderboard rank",
          hero: `#${d.rank.rank}`,
          unit: `of ${fmt(d.rank.of)}`,
          sub: `${fmt(total)} impressions so far`,
          visual: { type: "bar", pct, left: `${fmtPct(pct)} of 500K`, right: `${fmtCompact(Math.max(0, GOAL - total))} to go` },
        },
      };
    }

    case "gain": {
      const gain = d.latest?.delta;
      if (gain == null || !d.latest) return locked("Gain", "needs 2 logs");
      const best = d.rows.reduce<DayRow | null>((b, r) => (r.delta != null && (!b || r.delta > (b.delta ?? 0)) ? r : b), null);
      const isBest = best?.date === d.latest.date;
      return {
        kind,
        name: "Gain",
        available: true,
        title: `@${h}: ${fmtSigned(gain)} impressions in a day`,
        description: isBest
          ? `A new best day: ${fmtSigned(gain)} impressions on X.`
          : `${fmtSigned(gain)} impressions on X in the latest day. Best: ${fmtSigned(best?.delta ?? gain)}.`,
        postText: [
          isBest ? `New best day: ${fmtSigned(gain)} impressions on X.` : `${fmtSigned(gain)} impressions on X in my latest day.`,
          !isBest && best?.delta != null ? `Best day so far: ${fmtSigned(best.delta)} (${fmtDate(best.date)}).` : null,
          sign,
        ]
          .filter(Boolean)
          .join("\n"),
        imagePath: imageKindPath("gain"),
        sharePath: shareKindPath("gain"),
        face: {
          label: isBest ? "New best day" : "Latest day",
          hero: fmtSigned(gain),
          unit: "impressions",
          sub: fmtDate(d.latest.date),
          visual: {
            type: "compare",
            a: { label: "latest", value: gain },
            b: { label: "best", value: best?.delta ?? gain },
          },
        },
      };
    }

    case "milestone": {
      const passed = reachedMilestones(d.rows);
      if (!passed.length || !d.latest) return locked("Milestone", `unlocks at ${fmtCompact(MILESTONES[0])}`);
      // A specific milestone the creator picked (must be one they passed), else their highest.
      const pick = passed.find((m) => m.target === opts.milestone) ?? passed[passed.length - 1];
      const isLatest = pick === passed[passed.length - 1];
      const next = MILESTONES.find((m) => m > total);
      const mq = `m=${pick.target}&`;
      return {
        kind,
        name: "Milestone",
        available: true,
        title: `@${h} passed ${fmtCompact(pick.target)} impressions on X`,
        description: `Passed ${fmtCompact(pick.target)} impressions on X on ${fmtDate(pick.date)}.`,
        postText: [
          `Passed ${fmtCompact(pick.target)} impressions on X on ${fmtDate(pick.date)}.`,
          isLatest
            ? next
              ? `Next stop: ${fmtCompact(next)}. ${sign}`
              : `500K reached, tracked on progresshub as @${h}.`
            : `Now at ${fmtCompact(total)}. ${sign}`,
        ].join("\n"),
        imagePath: `/u/${h}/share/milestone?${mq}v=${v}`,
        sharePath: `/u/${h}?share=milestone&${mq}v=${v}`,
        face: {
          label: "Milestone",
          hero: fmtCompact(pick.target),
          unit: "impressions",
          sub: `passed on ${fmtDate(pick.date)}`,
          visual: {
            type: "bar",
            pct: (pick.target / GOAL) * 100,
            left: `${fmtCompact(pick.target)} of 500K`,
            right: isLatest ? (next ? `next: ${fmtCompact(next)}` : "goal reached") : `now ${fmtCompact(total)}`,
          },
        },
      };
    }
  }
}
