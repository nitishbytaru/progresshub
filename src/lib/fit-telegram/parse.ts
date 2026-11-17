/**
 * The fit bot's first-pass reader. Pure and predictable: it answers only clear messages
 * ("72.4", "w 72.4 yesterday", "gym chest triceps", "rest day", "lunch 2 roti dal", "today")
 * and returns null otherwise, so the caller can try the Groq classifier.
 */
import type { CoreMeal } from "../fit-foods";
import { parseWeight, type Muscle, type Unit } from "../fit-units";
import { addDays } from "../progress";

export type FitParsed =
  | { kind: "weight"; day: string; kg: number }
  | { kind: "weight_error"; error: string }
  | { kind: "gym"; day: string; muscles: Muscle[]; forgot: boolean }
  | { kind: "rest"; day: string }
  | { kind: "food"; day: string; meal: CoreMeal | null; text: string }
  | { kind: "summary" };

/** Words that name a muscle group (plurals and gym slang included). */
const MUSCLE_WORDS: [RegExp, Muscle[]][] = [
  [/\b(chest|pecs?)\b/, ["chest"]],
  [/\b(back|lats?)\b/, ["back"]],
  [/\b(shoulders?|delts?)\b/, ["shoulders"]],
  [/\b(biceps?|bis?)\b/, ["biceps"]],
  [/\b(triceps?|tris?)\b/, ["triceps"]],
  [/\b(legs?|quads?|hamstrings?|glutes?|calf|calves)\b/, ["legs"]],
  [/\barms?\b/, ["biceps", "triceps"]],
  [/\bpush\b/, ["chest", "shoulders", "triceps"]],
  [/\bpull\b/, ["back", "biceps"]],
];

const FORGOT_RE = /\b(don'?t remember|dont remember|do not remember|forgot|not sure|no idea|dunno)\b/;

export function musclesIn(text: string): Muscle[] {
  const t = text.toLowerCase();
  const out = new Set<Muscle>();
  for (const [re, ms] of MUSCLE_WORDS) if (re.test(t)) ms.forEach((m) => out.add(m));
  return [...out];
}

/** "today" / "yesterday" / "day before yesterday", stripped from the text. */
function takeDay(text: string, today: string): { day: string; rest: string } {
  if (/\bday before yesterday\b/.test(text)) return { day: addDays(today, -2), rest: text.replace(/\bday before yesterday\b/, " ") };
  if (/\byesterday\b/.test(text)) return { day: addDays(today, -1), rest: text.replace(/\byesterday\b/, " ") };
  return { day: today, rest: text.replace(/\btoday\b/, " ") };
}

export function parseFitMessage(text: string, today: string): FitParsed | null {
  const raw = text.trim().toLowerCase();
  if (!raw || raw.length > 300) return null;

  if (/^(today|summary|stats|status|progress|how am i doing|how'?s today)\??$/.test(raw)) return { kind: "summary" };

  // Food: "ate …", "food: …", "lunch 2 roti dal".
  const food = raw.match(/^(ate|had|eaten|food|eat|breakfast|lunch|dinner|snacks?)\b[:\-\s]*(.+)$/);
  if (food) {
    const word = food[1];
    const meal: CoreMeal | null = word === "breakfast" || word === "lunch" || word === "dinner" ? word : word.startsWith("snack") ? "snack" : null;
    const { day, rest } = takeDay(food[2], today);
    const body = rest.replace(/\s+/g, " ").trim();
    if (body.length >= 2) return { kind: "food", day, meal, text: body };
  }

  const { day, rest } = takeDay(raw, today);
  const body = rest.replace(/\s+/g, " ").trim();

  // Rest day: "rest", "rest day", "no gym", "skipped gym".
  if (/^(rest( day)?|no gym|skipped( the)? gym|off day)$/.test(body)) return { kind: "rest", day };

  // Gym: "gym chest triceps", "trained legs", "gym, don't remember".
  const gym = body.match(/^(gym|trained|workout|worked out|went to (the )?gym|hit)\b[:,\-\s]*(.*)$/);
  if (gym) {
    const tail = gym[3] ?? "";
    return { kind: "gym", day, muscles: musclesIn(tail), forgot: FORGOT_RE.test(tail) };
  }

  // Weight: "72.4", "w 72.4", "weight 160 lb", "72,4kg".
  const w = body.match(/^(?:w|wt|weight|weighed|weigh-?in|bw)?[:\s]*(\d{2,3}(?:[.,]\d{1,2})?)\s*(kg|kgs|kilos?|lbs?|pounds?)?$/);
  if (w) {
    const unit: Unit = w[2] && /^(lb|pound)/.test(w[2]) ? "lb" : "kg";
    const parsed = parseWeight(w[1], unit);
    return "error" in parsed ? { kind: "weight_error", error: parsed.error } : { kind: "weight", day, kg: parsed.kg };
  }
  return null;
}

/** The meal for "now" in the user's zone, when the message didn't name one. */
export function mealForHour(tz: string): CoreMeal {
  let h = 13;
  try {
    h = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: tz }).format(new Date()));
  } catch {}
  return h < 11 ? "breakfast" : h < 16 ? "lunch" : h < 19 ? "snack" : "dinner";
}
