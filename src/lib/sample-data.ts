/**
 * SAMPLE DATA. Fictional creators and numbers used until Supabase is connected.
 * Nothing here is a real user or a real result; the UI labels it as sample data.
 */
import { addDays, type Entry, withDeltas, paceOver, streak } from "./progress";

export const IS_SAMPLE = true;
export const SAMPLE_TODAY = "2026-11-07";

export const currentUser = { name: "Alex Vance", handle: "alexbuilds", joined: "2026-10-11" };

const START_TOTAL = 31_200;
// Daily gains Oct 12 → Nov 7, 2026.
const DAILY_GAINS = [
  1800, 2050, 1900, 2300, 2450, 2200, 2700, 2900, 2650, 3100, 3350, 3000, 3600, 3800, 3550, 4100,
  4400, 4250, 4900, 5300, 5100, 8900, 14300, 9650, 11100, 9800, 12450,
];

export const sampleEntries: Entry[] = DAILY_GAINS.reduce<Entry[]>(
  (acc, gain, i) => {
    const prev = acc[acc.length - 1];
    acc.push({ date: addDays(currentUser.joined, i + 1), total: prev.total + gain });
    return acc;
  },
  [{ date: currentUser.joined, total: START_TOTAL }],
);

export type Creator = {
  name: string;
  handle: string;
  total: number;
  pace7: number;
  streak: number;
  joined: string;
  isYou?: boolean;
};

const you = (() => {
  const rows = withDeltas(sampleEntries);
  return {
    name: currentUser.name,
    handle: currentUser.handle,
    total: rows[rows.length - 1].total,
    pace7: Math.round(paceOver(rows, 7)),
    streak: streak(rows, SAMPLE_TODAY),
    joined: currentUser.joined,
    isYou: true,
  } satisfies Creator;
})();

export const sampleCreators: Creator[] = [
  { name: "Mara Quill", handle: "maraquill", total: 486_200, pace7: 14_200, streak: 61, joined: "2026-07-02" },
  { name: "Theo Brandt", handle: "theobuilds", total: 412_000, pace7: 11_800, streak: 44, joined: "2026-07-20" },
  { name: "Ines Cole", handle: "inescole", total: 377_450, pace7: 6_900, streak: 12, joined: "2026-06-11" },
  { name: "Ravi Okafor", handle: "ravio", total: 298_300, pace7: 9_400, streak: 38, joined: "2026-08-03" },
  { name: "June Park", handle: "junepark_", total: 203_900, pace7: 15_600, streak: 21, joined: "2026-09-30" },
  you,
  { name: "Dan Mercer", handle: "danmercer", total: 142_300, pace7: 8_900, streak: 9, joined: "2026-09-14" },
  { name: "Noor Haddad", handle: "noorwrites", total: 98_400, pace7: 6_200, streak: 17, joined: "2026-10-01" },
  { name: "Leo Fischer", handle: "leofischer", total: 84_200, pace7: 5_400, streak: 5, joined: "2026-10-22" },
  { name: "Sam Ortiz", handle: "samortiz", total: 41_750, pace7: 3_100, streak: 3, joined: "2026-11-01" },
];
