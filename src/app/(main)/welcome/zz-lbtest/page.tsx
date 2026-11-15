import { LeaderboardTable } from "../../(app)/leaderboard/leaderboard-table";
const mk = (i: number) => ({ name: `Creator ${i}`, handle: `creator${i}`, total: 400000 - i * 20000, pace7: 1000, streak: i, avatarUrl: null, isYou: i === 2, lastGain: 500, lastLoggedOn: "2026-11-14" });
export default function P() {
  return <main className="p-4"><LeaderboardTable creators={[1,2,3,4,5].map(mk)} today="2026-11-15" finishers={<span />} count={<span />} /></main>;
}
