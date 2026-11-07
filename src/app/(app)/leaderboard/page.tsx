import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/progress/page-skeleton";
import { getLeaderboard, getViewer } from "@/lib/data";
import { fmt, fmtSigned } from "@/lib/format";
import { GOAL } from "@/lib/progress";
import { LeaderboardTable, type Creator } from "./leaderboard-table";

export const metadata: Metadata = { title: "Leaderboard" };

function median(values: number[]) {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export default function LeaderboardPage() {
  return (
    <Suspense fallback={<PageSkeleton blocks={["h-[180px]", "h-[100px]", "h-[480px]"]} />}>
      <Leaderboard />
    </Suspense>
  );
}

async function Leaderboard() {
  const [rows, { profile }] = await Promise.all([getLeaderboard(), getViewer()]);
  const creators: Creator[] = rows.map((r) => ({
    name: r.display_name || r.handle,
    handle: r.handle,
    total: r.total,
    pace7: r.pace7,
    streak: r.streak,
    avatarUrl: r.avatar_url,
    isYou: r.user_id === profile.id,
  }));
  const stats = [
    { label: "Creators racing", value: fmt(creators.length) },
    { label: "Median 7-day pace", value: creators.length ? `${fmtSigned(median(creators.map((c) => c.pace7)))}/day` : "—" },
    { label: "Past 250K", value: fmt(creators.filter((c) => c.total >= 250_000).length) },
    { label: "Reached 500K", value: fmt(creators.filter((c) => c.total >= GOAL).length) },
  ];

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <header className="flex flex-col gap-6">
        <div>
          <h1 className="text-[1.75rem] leading-tight font-bold tracking-[-0.025em] sm:text-[2.5rem]">
            Creators on their way to 500K
          </h1>
          <p className="mt-1 max-w-[60ch] text-sm text-muted-foreground">
            Everyone chases the same number, so the board compares like with like. Totals are self-reported daily.
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-hairline bg-hairline lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-surface-low p-4 sm:p-5">
              <dt className="text-xs text-muted-foreground sm:text-sm">{s.label}</dt>
              <dd className={`mt-1 font-mono text-xl font-semibold tracking-[-0.03em] sm:text-2xl`}>
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      </header>

      <LeaderboardTable creators={creators} />
    </div>
  );
}
