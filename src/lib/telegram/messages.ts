import { fmt, fmtCompact, fmtDate, fmtDateShort, fmtPct, fmtSigned } from "../format";
import { addDays, daysBetween, GOAL, isValidTarget, MILESTONE_STEP, milestoneCrossed, targetPlan, toUTC } from "../progress";
import { buildShareCard, reachedMilestones, type ShareKind } from "../share-cards";
import { validateEntry } from "../validation";
import { siteOrigin, type Creator } from "./data";
import type { ParsedLog } from "./parse";

/**
 * What the bots say, shared by Telegram and WhatsApp so the two can't drift. Text is Telegram HTML
 * (<b>, <i>, <code>); the WhatsApp adapter converts it. Buttons belong to each channel.
 */

export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const SHARE_LABELS: Partial<Record<ShareKind, string>> = {
  progress: "📈 Progress",
  rank: "🏆 Rank",
  streak: "🔥 Streak",
  gain: "⚡ Latest gain",
  milestone: "🎯 Milestone",
  target: "📅 Year-end target",
};

export const OFF_TOPIC =
  "I only help with your progresshub log and stats. Send today's total like <b>28,400</b>, or ask things like <i>when will I reach 500K?</i> Or pick an option below.";
export const HELP = "Hi! Send your total any time, or ask about your pace, rank, streak or milestones.";
export const LOG_PROMPT = "Send today's total, like <b>28,400</b>. Or what you added, like <b>+1,200</b>.";
export const LOAD_FAILED = "Couldn't load your account. Try again in a moment.";
export const NOTHING_TO_SHARE = "Nothing to share yet. Log a couple of days first.";
export const SHARE_PROMPT = "🔗 Which card do you want to post on X?";
export const CANCELLED = "Cancelled. Send the number again whenever you're ready.";
export const MENU_PROMPT = "What do you want to do?";
export const PRIVATE_NOTE = "\n\n<i>Make your profile public on progresshub to share this on X.</i>";
export const linkedText = (handle: string | null) =>
  `🎉 Linked${handle ? ` to <b>@${esc(handle)}</b>` : ""}!\n\nSend your total any time, like <b>28,400</b> or <b>+1,200</b>. I'll also remind you on days you haven't logged.`;

/** A 10-block text bar toward 500K. */
const bar = (pct: number) => {
  const full = Math.round(Math.min(pct, 100) / 10);
  return "█".repeat(full) + "░".repeat(10 - full);
};

export type StatKind = "progress" | "rank" | "streak" | "milestones";
export const shareKindFor = { progress: "progress", rank: "rank", streak: "streak", milestones: "milestone" } as const;

export function statText(kind: StatKind, c: Creator): string {
  if (!c.latest) return "You haven't logged anything yet. Send today's total, like <b>28,400</b>.";
  const total = c.latest.total;
  const pct = (total / GOAL) * 100;
  switch (kind) {
    case "progress":
      return [
        `📈 <b>${fmt(total)}</b> / 500K impressions`,
        `<code>${bar(pct)}</code> ${fmtPct(pct)}`,
        `7-day pace: <b>${fmtSigned(c.pace7)}/day</b>`,
        c.eta ? `500K around <b>${fmtDate(c.eta.etaDate)}</b>` : "Log a few more days for a 500K estimate.",
      ].join("\n");
    case "rank":
      if (total >= GOAL) return `🏁 Race finished! You reached <b>500K</b>\n${fmt(total)} impressions. You're on the finishers list.`;
      return c.rank
        ? `🏆 You're <b>#${c.rank.rank}</b> of ${fmt(c.rank.of)} ${c.rank.of === 1 ? "creator" : "creators"}\n${fmt(total)} impressions · ${fmtPct(pct)} of 500K`
        : "🏆 You're not on the leaderboard yet. Add your X username on progresshub to join.";
    case "streak": {
      const logged = new Set(c.rows.map((r) => r.date));
      const strip = Array.from({ length: 14 }, (_, i) => (logged.has(addDays(c.today, i - 13)) ? "🟩" : "⬛")).join("");
      return `🔥 <b>${c.streak}-day</b> streak\n${strip}\n<i>last 14 days</i>`;
    }
    case "milestones": {
      const passed = reachedMilestones(c.rows);
      const next = Math.floor(total / MILESTONE_STEP) * MILESTONE_STEP + MILESTONE_STEP;
      const recent = passed.slice(-5).reverse().map((m) => `✅ ${fmtCompact(m.target)} · ${fmtDateShort(m.date)}`);
      return [
        `🎯 <b>${passed.length}/20</b> milestones`,
        ...(recent.length ? recent : ["None yet. The first is 25K."]),
        total < GOAL ? `Next: <b>${fmtCompact(next)}</b> (${fmt(next - total)} to go)` : "🏁 500K reached!",
      ].join("\n");
    }
  }
}

/** The public link and X post intent for a card, or null if it can't be shared. */
export function shareLinks(c: Creator, kind: ShareKind, opts?: Parameters<typeof buildShareCard>[2]) {
  if (!c.handle || !c.isPublic) return null;
  const card = buildShareCard(kind, c, opts);
  if (!card.available) return null;
  const url = `${siteOrigin()}${card.sharePath}`;
  return { url, intent: `https://x.com/intent/post?text=${encodeURIComponent(card.postText)}&url=${encodeURIComponent(url)}` };
}

/** Text plus whether it's a real answer that can carry a share button. */
type Reply = { text: string; share: boolean };

/** "When will I reach 500K at this pace?" */
export function etaReply(c: Creator): Reply {
  if (!c.latest) return { text: "Log your first day and I can estimate your 500K date.", share: false };
  if (c.latest.total >= GOAL) return { text: "🏁 You've already reached 500K!", share: false };
  if (!c.eta || c.pace7 <= 0) return { text: "I need a few days of gains to estimate that. Keep logging and ask again.", share: false };
  const left = GOAL - c.latest.total;
  return {
    share: true,
    text: [
      `⏳ At your 7-day pace of <b>${fmtSigned(c.pace7)}/day</b>, you'll reach 500K around <b>${fmtDate(c.eta.etaDate)}</b>.`,
      `That's <b>${fmt(c.eta.daysLeft)} days</b> from your last log, with ${fmt(left)} to go.`,
      `<i>An estimate: it assumes your pace stays the same.</i>`,
    ].join("\n"),
  };
}

/** "How much per day to hit 500K by <date>?" */
export function targetReply(c: Creator, target: string): Reply {
  if (!c.latest) return { text: "Log your first day, then ask again.", share: false };
  if (!isValidTarget(target, c.latest.date)) return { text: "Pick a date after your last log and within 5 years, like <i>by December 31</i>.", share: false };
  const plan = targetPlan(c.latest.total, c.latest.date, target);
  if (plan.remaining === 0) return { text: "🏁 You've already reached 500K!", share: false };
  return {
    share: true,
    text: [
      `📅 Target: <b>${fmtDate(target)}</b>`,
      `You need <b>${fmtSigned(plan.perDay)}/day</b>: ${fmt(plan.remaining)} to go in ${fmt(plan.days)} days.`,
      c.pace7 >= plan.perDay ? `✅ Your 7-day pace (${fmtSigned(c.pace7)}/day) is enough.` : `Your 7-day pace is ${fmtSigned(c.pace7)}/day.`,
    ].join("\n"),
  };
}

/** Resolves a gain to a total and validates it. On success, `text` asks the creator to confirm. */
export function confirmReply(c: Creator, parsed: ParsedLog): { ok: false; text: string } | { ok: true; text: string; date: string; total: number } {
  const before = [...c.rows].reverse().find((r) => toUTC(r.date) < toUTC(parsed.date)) ?? null;
  const after = c.rows.find((r) => toUTC(r.date) > toUTC(parsed.date)) ?? null;
  const total = parsed.kind === "gain" ? (before?.total ?? 0) + parsed.value : parsed.value;
  const problem = validateEntry({ date: parsed.date, total, today: c.today, before, after });
  if (problem) return { ok: false, text: `⚠️ ${esc(problem)}` };

  const gain = before ? total - before.total : null;
  const day = parsed.date === c.today ? `today (${fmtDateShort(parsed.date)})` : fmtDate(parsed.date);
  const span = before ? daysBetween(before.date, parsed.date) : 0;
  return {
    ok: true,
    date: parsed.date,
    total,
    text: `Save <b>${fmt(total)}</b> for ${day}?${gain != null ? `\nThat's <b>${fmtSigned(gain)}</b> since ${fmtDateShort(before!.date)}${span > 1 ? ` (${span} days)` : ""}.` : ""}`,
  };
}

/** The highest total on any other day: the baseline for spotting a newly crossed milestone. */
export const bestExcluding = (c: Creator, date: string) => Math.max(0, ...c.rows.filter((r) => r.date !== date).map((r) => r.total));

/** The message after a save. `crossed` means it also celebrates a new milestone. */
export function savedReply(c: Creator | null, date: string, total: number, created: boolean, bestBefore: number) {
  const pct = (total / GOAL) * 100;
  const lines = [
    `✅ ${created ? "Logged" : "Updated"} <b>${fmtDate(date)}</b>: <b>${fmt(total)}</b>`,
    `<code>${bar(pct)}</code> ${fmtPct(pct)} of 500K`,
    c?.eta ? `500K around <b>${fmtDate(c.eta.etaDate)}</b>` : null,
  ].filter(Boolean);
  const milestone = c ? milestoneCrossed(bestBefore, Math.max(bestBefore, total)) : null;
  return {
    crossed: Boolean(milestone),
    text: milestone ? `${lines.join("\n")}\n\n🎉 <b>Milestone: ${fmtCompact(milestone)}!</b>` : lines.join("\n"),
  };
}
