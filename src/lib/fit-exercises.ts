/** Exercise library for set logging, mapped to the six muscle groups. Client-safe. */
import type { Muscle } from "./fit-units";

export type Exercise = {
  key: string;
  name: string;
  muscle: Muscle;
  kind: "compound" | "isolation";
  bodyweight?: boolean;
  /** This exercise's own bright colour (unique per exercise; see exerciseColor). */
  color: string;
  /**
   * Photo base path (frames `${image}-0.webp` start, `${image}-1.webp` end), from the public-domain
   * free-exercise-db (Unlicense). Own exercises have none.
   */
  image?: string;
};

// prettier-ignore
const ROWS: [string, string, Muscle, Exercise["kind"], boolean?][] = [
  ["bench-press", "Bench press", "chest", "compound"], ["incline-bench", "Incline bench press", "chest", "compound"],
  ["db-press", "Dumbbell press", "chest", "compound"], ["incline-db-press", "Incline dumbbell press", "chest", "compound"],
  ["chest-fly", "Chest fly (machine/cable)", "chest", "isolation"], ["db-fly", "Dumbbell fly", "chest", "isolation"],
  ["pushup", "Push-up", "chest", "compound", true], ["dips-chest", "Chest dips", "chest", "compound", true],
  ["cable-crossover", "Cable crossover", "chest", "isolation"], ["pec-deck", "Pec deck", "chest", "isolation"],
  ["deadlift", "Deadlift", "back", "compound"], ["pullup", "Pull-up", "back", "compound", true],
  ["lat-pulldown", "Lat pulldown", "back", "compound"], ["barbell-row", "Barbell row", "back", "compound"],
  ["db-row", "One-arm dumbbell row", "back", "compound"], ["seated-row", "Seated cable row", "back", "compound"],
  ["tbar-row", "T-bar row", "back", "compound"], ["face-pull", "Face pull", "back", "isolation"],
  ["straight-arm-pulldown", "Straight-arm pulldown", "back", "isolation"], ["hyperextension", "Back extension", "back", "isolation", true],
  ["ohp", "Overhead press", "shoulders", "compound"], ["db-shoulder-press", "Dumbbell shoulder press", "shoulders", "compound"],
  ["arnold-press", "Arnold press", "shoulders", "compound"], ["lateral-raise", "Lateral raise", "shoulders", "isolation"],
  ["front-raise", "Front raise", "shoulders", "isolation"], ["rear-delt-fly", "Rear delt fly", "shoulders", "isolation"],
  ["upright-row", "Upright row", "shoulders", "compound"], ["shrug", "Shrugs", "shoulders", "isolation"],
  ["barbell-curl", "Barbell curl", "biceps", "isolation"], ["db-curl", "Dumbbell curl", "biceps", "isolation"],
  ["hammer-curl", "Hammer curl", "biceps", "isolation"], ["preacher-curl", "Preacher curl", "biceps", "isolation"],
  ["incline-curl", "Incline dumbbell curl", "biceps", "isolation"], ["cable-curl", "Cable curl", "biceps", "isolation"],
  ["concentration-curl", "Concentration curl", "biceps", "isolation"], ["chinup", "Chin-up", "biceps", "compound", true],
  ["pushdown", "Triceps pushdown", "triceps", "isolation"], ["skullcrusher", "Skull crusher", "triceps", "isolation"],
  ["overhead-ext", "Overhead triceps extension", "triceps", "isolation"], ["close-grip-bench", "Close-grip bench press", "triceps", "compound"],
  ["dips-triceps", "Triceps dips", "triceps", "compound", true], ["kickback", "Triceps kickback", "triceps", "isolation"],
  ["diamond-pushup", "Diamond push-up", "triceps", "compound", true],
  ["squat", "Back squat", "legs", "compound"], ["front-squat", "Front squat", "legs", "compound"],
  ["leg-press", "Leg press", "legs", "compound"], ["rdl", "Romanian deadlift", "legs", "compound"],
  ["lunge", "Walking lunge", "legs", "compound"], ["bulgarian-split", "Bulgarian split squat", "legs", "compound"],
  ["leg-extension", "Leg extension", "legs", "isolation"], ["leg-curl", "Leg curl", "legs", "isolation"],
  ["calf-raise", "Calf raise", "legs", "isolation", true], ["hip-thrust", "Hip thrust", "legs", "compound"],
  ["goblet-squat", "Goblet squat", "legs", "compound", true], ["hack-squat", "Hack squat", "legs", "compound"],
];

/**
 * A bright, unique colour per exercise. Hues step by the golden angle (137.5°), so exercises listed
 * next to each other (the same muscle group) land far apart on the wheel, and lightness cycles
 * through three steps so near-hue neighbours still differ in brightness. All read as neon on the
 * rubber ground and take rubber ink (#141414) on top.
 */
const LIGHTNESS = [0.82, 0.72, 0.9];
export const exerciseColor = (i: number) =>
  `oklch(${LIGHTNESS[i % 3]} 0.17 ${((i * 137.508 + 25) % 360).toFixed(1)})`;
export const EXERCISE_INK = "#141414";

export const EXERCISES: Exercise[] = ROWS.map(
  ([key, name, muscle, kind, bodyweight], i) => ({
    key,
    name,
    muscle,
    kind,
    bodyweight,
    color: exerciseColor(i),
    image: `/fit/exercises/${key}`,
  }),
);
export const EXERCISE_BY_KEY = new Map(EXERCISES.map((e) => [e.key, e]));

/** Epley estimated one-rep max. */
export const e1rm = (kg: number, reps: number) =>
  reps <= 1 ? kg : Math.round(kg * (1 + reps / 30) * 10) / 10;

/** A user's own exercise as stored (custom_exercises). Sets reference it as `c:<id>`. */
export type CustomExerciseRow = { id: string; name: string; muscle: Muscle; bodyweight: boolean };
export const customKey = (id: string) => `c:${id}`;
export const isCustomKey = (key: string) => key.startsWith("c:");

/** Turn your own exercises into library entries, each with its own colour after the built-in ones. */
export const toExercises = (rows: CustomExerciseRow[]): Exercise[] =>
  rows.map((r, i) => ({
    key: customKey(r.id),
    name: r.name,
    muscle: r.muscle,
    kind: "isolation",
    bodyweight: r.bodyweight,
    color: exerciseColor(EXERCISES.length + i),
  }));
