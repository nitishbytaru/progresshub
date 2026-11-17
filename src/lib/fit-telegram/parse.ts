/**
 * The fit bot's first-pass reader. Pure and predictable: it answers only clear messages
 * ("72.4", "w 72.4 yesterday", "gym chest triceps", "rest day", "lunch 2 roti dal", "today")
 * and returns null otherwise, so the caller can try the Groq classifier.
 */
import type { CoreMeal } from "../fit-foods";
import { parseWeight, type Muscle, type Unit } from "../fit-units";
import { addDays } from "../progress";

export type FitParsed =
  /** `unit` is null when the message didn't say kg or lb: the bot asks instead of guessing. */
  | { kind: "weight"; day: string; dayGiven: boolean; value: number; unit: Unit | null }
  | { kind: "weight_error"; error: string }
  | { kind: "gym"; day: string; dayGiven: boolean; muscles: Muscle[]; forgot: boolean }
  | { kind: "rest"; day: string; dayGiven: boolean }
  | { kind: "food"; day: string; dayGiven: boolean; meal: CoreMeal | null; text: string }
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

/** "today" / "yesterday" / "day before yesterday", stripped from the text. `given` = a day was named. */
function takeDay(text: string, today: string): { day: string; given: boolean; rest: string } {
  if (/\bday before yesterday\b/.test(text)) return { day: addDays(today, -2), given: true, rest: text.replace(/\bday before yesterday\b/, " ") };
  if (/\byesterday\b/.test(text)) return { day: addDays(today, -1), given: true, rest: text.replace(/\byesterday\b/, " ") };
  if (/\b(today|this morning|tonight)\b/.test(text)) return { day: today, given: true, rest: text.replace(/\b(today|this morning|tonight)\b/, " ") };
  return { day: today, given: false, rest: text };
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
    const { day, given, rest } = takeDay(food[2], today);
    const body = rest.replace(/\s+/g, " ").trim();
    if (body.length >= 2) return { kind: "food", day, dayGiven: given, meal, text: body };
  }

  const { day, given, rest } = takeDay(raw, today);
  const body = rest.replace(/\s+/g, " ").trim();

  // Rest day: "rest", "rest day", "no gym", "skipped gym".
  if (/^(rest( day)?|no gym|skipped( the)? gym|off day)$/.test(body)) return { kind: "rest", day, dayGiven: given };

  // Gym: "gym chest triceps", "trained legs", "gym, don't remember".
  const gym = body.match(/^(gym|trained|workout|worked out|went to (the )?gym|hit)\b[:,\-\s]*(.*)$/);
  if (gym) {
    const tail = gym[3] ?? "";
    return { kind: "gym", day, dayGiven: given, muscles: musclesIn(tail), forgot: FORGOT_RE.test(tail) };
  }

  // Weight: "72.4", "w 72.4", "weight 160 lb", "72,4kg".
  const w = body.match(/^(?:w|wt|weight|weighed|weigh-?in|bw)?[:\s]*(\d{2,3}(?:[.,]\d{1,2})?)\s*(kg|kgs|kilos?|lbs?|pounds?)?$/);
  if (w) {
    const unit: Unit | null = !w[2] ? null : /^(lb|pound)/.test(w[2]) ? "lb" : "kg";
    const value = Number(w[1].replace(",", "."));
    // With a unit, check its range now; without one, it must fit at least one unit.
    const units: Unit[] = unit ? [unit] : ["kg", "lb"];
    const errors = units.map((u) => parseWeight(w[1], u)).filter((x) => "error" in x) as { error: string }[];
    if (errors.length === units.length) return { kind: "weight_error", error: errors[0].error };
    return { kind: "weight", day, dayGiven: given, value, unit };
  }
  return null;
}

/** True when a food text names any amount ("2 roti", "a bowl of dal", "half plate", "200 g"). */
export const hasAmount = (text: string) =>
  /\d|\b(a|an|one|two|three|four|five|six|half|quarter|bowl|bowls|plate|plates|cup|cups|glass|glasses|piece|pieces|pcs?|slice|slices|spoon|spoons|tbsp|tsp|handful|scoop|scoops|katori|serving|servings)\b/i.test(text);

const DAY_WORDS = /\b(yesterday|today|tonight|this morning|(?:mon|tues|wednes|thurs|fri|satur|sun)day|\d{1,2}(?:st|nd|rd|th)|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.? \d{1,2})\b/g;

/** How many day references a message has ("yesterday … today" = 2). */
export function dayMentions(text: string): number {
  const t = text.toLowerCase().replace(/\bday before yesterday\b/g, " daybeforeyesterday ");
  return (t.match(DAY_WORDS) ?? []).length + (t.match(/\bdaybeforeyesterday\b/g) ?? []).length;
}

export type SplitResult = { ok: true; parts: FitParsed[] } | { ok: false; days: number };

/**
 * A message naming several days ("72.4 yesterday, 72.1 today", "gym chest yesterday and legs today")
 * becomes one entry per day. Only weigh-ins, gym and rest days are split; anything that doesn't
 * cleanly come apart (food lists, unknown words) is refused so the bot can ask instead of guessing.
 */
export function splitDays(text: string, today: string): SplitResult | null {
  const days = dayMentions(text);
  if (days < 2) return null;
  const pieces = text
    .toLowerCase()
    .split(/\n|;|,|\band\b|&|\bthen\b/)
    .map((s) => s.trim())
    .filter(Boolean);
  const parts: FitParsed[] = [];
  let lead = "";
  for (const piece of pieces) {
    let p = parseFitMessage(piece, today);
    // "gym chest yesterday, legs today": the second piece borrows the first one's keyword.
    if (!p && lead) p = parseFitMessage(`${lead} ${piece}`, today);
    if (!p || p.kind === "food" || p.kind === "summary" || p.kind === "weight_error") return { ok: false, days };
    if (!("dayGiven" in p) || !p.dayGiven) return { ok: false, days };
    lead = p.kind === "gym" ? "gym" : p.kind === "weight" ? "w" : "";
    parts.push(p);
  }
  // Every named day must have landed in exactly one entry.
  const seen = new Set(parts.map((p) => ("day" in p ? `${p.kind}:${p.day}` : "")));
  if (parts.length < 2 || parts.length !== days || seen.size !== parts.length) return { ok: false, days };
  return { ok: true, parts };
}
