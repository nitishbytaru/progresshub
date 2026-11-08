/**
 * The bot's first-pass reader for log messages. Pure and predictable: it only answers when the
 * message is unambiguous (one number, optional "today"/"yesterday", optional gain wording) and
 * returns null otherwise, so the caller can try the Groq fallback or ask again.
 */
import { addDays } from "../progress";

export type ParsedLog = {
  date: string;
  /** "total" = cumulative impressions (what the app stores); "gain" = added since the last log. */
  kind: "total" | "gain";
  value: number;
};

const MULTIPLIERS: Record<string, number> = {
  k: 1_000,
  thousand: 1_000,
  m: 1_000_000,
  mn: 1_000_000,
  million: 1_000_000,
  l: 100_000,
  lakh: 100_000,
  lakhs: 100_000,
};

// A number with optional thousands separators/decimals, then an optional size word.
const NUMBER_RE = /(\+)?(\d+(?:[,\s]\d{3})*(?:\.\d+)?)\s*(k|thousand|mn|m|million|lakhs?|l)?\b/gi;
const GAIN_RE = /\b(added|add|gained|gain|got|more|new|extra|increase[d]?|up)\b/i;
const TOTAL_RE = /\b(total|at|now|reached|overall|cumulative)\b/i;

export function parseLogMessage(text: string, today: string): ParsedLog | null {
  const msg = text.trim().toLowerCase();
  if (!msg || msg.length > 200) return null;

  const numbers = [...msg.matchAll(NUMBER_RE)];
  if (numbers.length !== 1) return null; // none, or ambiguous ("nov 7 27900")

  const [, plus, digits, unit] = numbers[0];
  const base = Number(digits.replace(/[,\s]/g, ""));
  const value = Math.round(base * (unit ? MULTIPLIERS[unit] : 1));
  if (!Number.isFinite(value) || value <= 0) return null;
  // "28.4" with no unit isn't a whole impression count.
  if (!unit && !Number.isInteger(base)) return null;

  const date = /\byesterday\b/.test(msg) ? addDays(today, -1) : today;
  const kind = plus || (GAIN_RE.test(msg) && !TOTAL_RE.test(msg)) ? "gain" : "total";
  return { date, kind, value };
}
