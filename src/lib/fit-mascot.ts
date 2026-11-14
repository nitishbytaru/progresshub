/**
 * Dumbo the dumbbell: what he feels and says. Pure functions (no I/O) so moods and alerts are
 * testable and identical everywhere. Emoji live only inside his speech, never as UI icons.
 */
import { MUSCLES, muscleLabel, type Muscle } from "./fit-units";
import { addDays, daysBetween, weekStart, type FitLog } from "./fit-stats";

export type Mood = "idle" | "curious" | "thinking" | "happy" | "proud" | "sad" | "sore" | "sleepy" | "shocked" | "flex";
export type FlowGoal = "lose" | "maintain" | "gain";

/** A change of more than this (kg) since the last weigh-in is probably a typo. */
export const SHOCK_KG = 2;
/** Moves within ±this (kg) count as flat. */
export const FLAT_KG = 0.1;

export type WeightVerdict = "toward" | "away" | "flat" | "shock" | "first";

/**
 * How a new weight relates to the goal. `delta` = new − previous (kg), null when there is no
 * previous weigh-in. Maintain: small moves (≤0.5 kg) are good, bigger ones drift away.
 */
export function weightVerdict(delta: number | null, goal: FlowGoal): WeightVerdict {
  if (delta === null) return "first";
  const d = Math.round(delta * 10) / 10;
  if (Math.abs(d) > SHOCK_KG) return "shock";
  if (Math.abs(d) <= FLAT_KG) return "flat";
  if (goal === "maintain") return Math.abs(d) <= 0.5 ? "toward" : "away";
  return (goal === "lose" ? d < 0 : d > 0) ? "toward" : "away";
}

export const VERDICT_MOOD: Record<WeightVerdict, Mood> = { toward: "happy", away: "sad", flat: "idle", shock: "shocked", first: "curious" };

export type Alert = { muscle: Muscle; kind: "twice" | "thrice" | "yesterday" | "first" | "comeback"; mood: Mood };

/**
 * Drop-in alerts when a muscle is picked for `day`, from the user's other logs (the day itself is
 * excluded so re-editing doesn't count twice):
 *  - trained the day before (no 48h rest) → sore
 *  - already trained this Mon–Sun week → "twice" (or "thrice" for 2+) → sore
 *  - never trained before → first-time celebration
 *  - 14+ days since last time → comeback
 */
export function muscleAlert(logs: FitLog[], day: string, muscle: Muscle): Alert | null {
  const others = logs.filter((l) => l.gym && l.day !== day && l.muscles.includes(muscle));
  const mon = weekStart(day);
  const thisWeek = others.filter((l) => l.day >= mon && l.day <= addDays(mon, 6)).length;
  if (others.some((l) => l.day === addDays(day, -1))) return { muscle, kind: "yesterday", mood: "sore" };
  if (thisWeek >= 2) return { muscle, kind: "thrice", mood: "sore" };
  if (thisWeek === 1) return { muscle, kind: "twice", mood: "sore" };
  const before = others.filter((l) => l.day < day).map((l) => l.day).sort();
  if (!others.length) return { muscle, kind: "first", mood: "proud" };
  if (before.length && daysBetween(before.at(-1)!, day) >= 14) return { muscle, kind: "comeback", mood: "happy" };
  return null;
}

/** Body-part words for jokes ("my pecs are crying"). */
const PART: Record<Muscle, string> = { chest: "pecs", back: "lats", shoulders: "delts", biceps: "guns", triceps: "tris", legs: "quads" };

type Lines = string[];
const L = (...xs: string[]): Lines => xs;

/** Copy table: several lines per situation so repeats feel alive. `{x}` placeholders filled by `say`. */
export const LINES = {
  hello: L("Ready to load the bar?", "Let's log today. I'm all ears… well, all plates.", "Hey champ! What are we logging?"),
  date: L("{date}. Got it!", "Locked in: {date}.", "{date} it is. Plate stamped."),
  dateExisting: L("You logged {kg} that day. Update it?", "{date} already says {kg}. Let's fix it up."),
  weighIn: L("Step on the scale. No judging. Okay, a little judging.", "What does the scale say?", "Numbers time. Breathe in…"),
  first: L("First weigh-in! Every bar starts empty.", "Day one. This is where the story starts."),
  towardLose: L("Down {d}! We're cutting like a pro ✂️", "{d} lighter. The plan is working!", "Look at that drop: {d}! 🔥"),
  towardGain: L("Up {d}! Gains incoming 💪", "{d} heavier. Feed the machine!", "Bulk mode: +{d}. Love it."),
  towardMaintain: L("Steady as a squat rack. Nice.", "Holding the line. That's discipline."),
  away: L("{d} the wrong way. One day isn't a trend.", "Hmm, {d} off course. Tomorrow we bounce back.", "Not our day. Water weight happens 💧"),
  flat: L("Rock steady.", "Same as last time. Consistency!", "Flat line, strong mind."),
  shock: L("Whoa, {d}?! Double-check that number?", "That's a big jump ({d}). Typo maybe?"),
  gymAsk: L("Did you hit the gym?", "Training day or recovery day?"),
  gymYes: L("Gym day {n}! Let's go!", "That's gym day {n}. Beast mode 🏋️"),
  rest: L("Rest day. Muscles grow while you nap 😴", "Recovery is training too. Zzz…"),
  muscles: L("What did you hit today?", "Which plates are we loading?"),
  pick_chest: L("Chest day! Puff it up 🫁", "Bench press energy!"),
  pick_back: L("Back attack! Spread those wings 🦅", "Rows on rows."),
  pick_shoulders: L("Boulder shoulders unlocked.", "Press it overhead!"),
  pick_biceps: L("Curls for the girls… and everyone 💪", "Gun show tickets: sold out."),
  pick_triceps: L("Tris! Two-thirds of the arm, baby.", "Pushdowns pay off."),
  pick_legs: L("Leg day! Respect 🦵", "Squats > excuses."),
  twice: L("{M} twice this week? My {p} are crying 😵", "Oh no, {m} again this week… my {p} hurt!", "{M} again? Give those {p} a breather 🥵"),
  thrice: L("{M} THREE times this week?! My {p} filed a complaint 😩", "That's a lot of {m}. Ever heard of rest?"),
  yesterday: L("{M} two days in a row? My {p} need 48h! 🥴", "Back-to-back {m}… ouch, ouch, ouch."),
  firstMuscle: L("Finally, {m} day! 🎉", "First {m} session. Welcome to the party!"),
  comeback: L("{M} is back after a long break!", "Long time no {m}! Missed you."),
  ouch: L("Ouch… 🥴", "Oof. Easy, champ.", "My poor plates 😣"),
  saving: L("Loading the bar…", "Stamping the plates…"),
  saved: L("Bar loaded. Proud of you!", "Logged! That's how habits are built.", "Done! See you tomorrow, champ."),
  error: L("Couldn't save that. Let's try again.", "Something slipped. One more rep?"),
} satisfies Record<string, Lines>;

export type LineKey = keyof typeof LINES;

/** Deterministic pick (seeded) with placeholder fill. */
export function say(key: LineKey, seed: string, vars: Record<string, string | number> = {}): string {
  const pool = LINES[key];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const line = pool[Math.abs(h) % pool.length];
  return line.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
}

/** Speech for a muscle alert. */
export function alertLine(a: Alert, seed: string): string {
  const key: LineKey = a.kind === "first" ? "firstMuscle" : a.kind;
  const m = muscleLabel(a.muscle).toLowerCase();
  return say(key, seed, { m, M: muscleLabel(a.muscle), p: PART[a.muscle] });
}

export const isMuscleKey = (m: string): m is Muscle => (MUSCLES as readonly string[]).includes(m);
