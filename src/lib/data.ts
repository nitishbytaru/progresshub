import { forecast, milestones, paceOver, streak, withDeltas } from "./progress";
import { SAMPLE_TODAY, sampleEntries } from "./sample-data";

/** Everything a screen needs about the signed-in creator's progress. Swap the source for Supabase later. */
export function getProgress() {
  const today = SAMPLE_TODAY;
  const rows = withDeltas(sampleEntries);
  const latest = rows[rows.length - 1];
  const pace7 = paceOver(rows, 7);
  const pace28 = paceOver(rows, 28);
  return {
    today,
    rows,
    latest,
    previous: rows[rows.length - 2] ?? null,
    pace7,
    pace28,
    eta: forecast(latest.total, pace7, latest.date),
    etaSlow: forecast(latest.total, pace28, latest.date),
    milestones: milestones(rows, pace7),
    streak: streak(rows, today),
  };
}

export type Progress = ReturnType<typeof getProgress>;
