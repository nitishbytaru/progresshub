/**
 * Shared validation for everything a creator types in. Used by the forms (instant feedback)
 * and the server actions (the real gate), so the rules and messages never drift apart.
 */
import { fmt, fmtDate, fmtDateShort } from "./format";
import { addDays, daysBetween, toUTC, type Entry } from "./progress";

export const LIMITS = {
  /** Highest cumulative total accepted. 2× the goal: anything above is almost surely a typo. */
  maxTotal: 1_000_000,
  /** Highest gain accepted for a single day: the whole 500K goal. */
  maxDailyGain: 500_000,
  /** How far back a log may be added or corrected. */
  maxBackfillDays: 365,
  /** Digits the input will accept while typing (lets an over-limit number show its error). */
  maxDigits: 9,
} as const;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Parses what someone typed or pasted. Commas and spaces are fine; anything else gets a specific message. */
export function parseImpressions(input: string): { value: number | null; error: string | null } {
  const trimmed = input.trim();
  if (trimmed === "") return { value: null, error: null };
  const compact = trimmed.replace(/[\s,]/g, "");
  if (/^-/.test(compact)) return { value: null, error: "Impressions can't be negative." };
  if (/[kmb]$/i.test(compact)) {
    return { value: null, error: "Type the full number, e.g. 26800 instead of 26.8K. Hover the total in X analytics to see it." };
  }
  if (/[.]/.test(compact)) return { value: null, error: "Use a whole number. Impressions don't have decimals." };
  if (!/^\d+$/.test(compact)) return { value: null, error: "Use digits only." };
  if (compact.length > LIMITS.maxDigits) return { value: null, error: `That number is too long. Totals above ${fmt(LIMITS.maxTotal)} aren't accepted.` };
  return { value: Number(compact), error: null };
}

export function validateDate(date: string, today: string): string | null {
  if (!DATE_RE.test(date) || Number.isNaN(toUTC(date))) return "Pick a valid day.";
  if (toUTC(date) > toUTC(today)) return "You can't log a day that hasn't happened yet.";
  if (daysBetween(date, today) > LIMITS.maxBackfillDays) {
    return `You can only add or correct logs from the last ${LIMITS.maxBackfillDays} days (back to ${fmtDate(addDays(today, -LIMITS.maxBackfillDays))}).`;
  }
  return null;
}

/**
 * Full check for one log. `before`/`after` are the nearest existing logs on either side of `date`
 * (excluding the one being edited), so totals stay non-decreasing and daily gains stay believable.
 */
/** "today (Nov 8)", "yesterday (Nov 7)" or "Nov 5, 2026": names the day the way the creator thinks of it. */
function dayName(date: string, today: string) {
  if (date === today) return `today (${fmtDateShort(date)})`;
  if (date === addDays(today, -1)) return `yesterday (${fmtDateShort(date)})`;
  return fmtDate(date);
}

export function validateEntry(args: {
  date: string;
  total: number | null;
  today: string;
  before: Entry | null;
  after: Entry | null;
}): string | null {
  const { date, total, today, before, after } = args;
  const dateError = validateDate(date, today);
  if (dateError) return dateError;

  if (total === null) return "Enter your total impressions from X analytics.";
  if (!Number.isSafeInteger(total)) return "Use a whole number.";
  if (total <= 0) return "Enter a number above zero.";
  if (total > LIMITS.maxTotal) {
    return `${fmt(total)} is over the ${fmt(LIMITS.maxTotal)} limit. Check you copied total impressions, not another metric.`;
  }

  if (before) {
    if (total < before.total) {
      return `This can't be lower than ${dayName(before.date, today)}, which is ${fmt(before.total)}. Totals only go up, so enter ${fmt(before.total)} or more.`;
    }
    const days = Math.max(1, daysBetween(before.date, date));
    const perDay = (total - before.total) / days;
    if (perDay > LIMITS.maxDailyGain) {
      return `That's +${fmt(total - before.total)} since ${fmtDate(before.date)}${days > 1 ? ` (${fmt(perDay)} a day)` : ""}. Gains over ${fmt(LIMITS.maxDailyGain)} a day aren't accepted. Check the number.`;
    }
  }
  if (after) {
    if (total > after.total) {
      return `This can't be higher than ${dayName(after.date, today)}, which is ${fmt(after.total)}. An earlier day must be ${fmt(after.total)} or less. If ${dayName(after.date, today)} is wrong, fix it first.`;
    }
    const days = Math.max(1, daysBetween(date, after.date));
    if ((after.total - total) / days > LIMITS.maxDailyGain) {
      return `That would mean +${fmt(after.total - total)} by ${fmtDate(after.date)}, over ${fmt(LIMITS.maxDailyGain)} a day. Check this number or that day's.`;
    }
  }
  return null;
}

/* ---------- Account fields ---------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(email: string): string | null {
  if (!email) return "Enter your email.";
  if (email.length > 254 || !EMAIL_RE.test(email)) return "That doesn't look like an email address. Check for typos.";
  return null;
}

export function validateNewPassword(password: string): string | null {
  if (password.length < 8) return "Use at least 8 characters for your password.";
  if (password.length > 72) return "Keep your password to 72 characters or fewer.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Use at least one letter and one number.";
  return null;
}

export function validateHandle(raw: string): { handle: string; error: string | null } {
  const handle = raw.trim().replace(/^@/, "");
  if (!handle) return { handle, error: "Enter your X handle." };
  if (handle.length > 15) return { handle, error: "X handles are 15 characters or fewer." };
  if (!/^[A-Za-z0-9_]+$/.test(handle)) return { handle, error: "X handles use only letters, numbers and underscores." };
  return { handle, error: null };
}

export function validateDisplayName(raw: string): { name: string; error: string | null } {
  const name = raw.trim().replace(/\s+/g, " ");
  if (!name) return { name, error: "Add the name you want on the leaderboard." };
  if (name.length > 50) return { name, error: "Keep your name to 50 characters or fewer." };
  if (/[<>]/.test(name)) return { name, error: "Names can't include < or >." };
  return { name, error: null };
}
