import type { Metadata } from "next";
import { Suspense } from "react";
import { TrendingUp, Trophy } from "lucide-react";
import { PageSkeleton } from "@/components/progress/page-skeleton";
import { getLeaderboard, getViewer } from "@/lib/data";
import { fmt } from "@/lib/format";
import { GOAL } from "@/lib/progress";
import { cn } from "@/lib/utils";
import { LeaderboardTable, type Creator } from "./leaderboard-table";

export const metadata: Metadata = { title: "Leaderboard" };

export default function LeaderboardPage() {
  return (
    <Suspense fallback={<PageSkeleton blocks={["h-[72px]", "h-[480px]"]} />}>
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
  const of = Math.max(creators.length, 1);
  const stats = [
    { label: "past 250K", count: creators.filter((c) => c.total >= 250_000).length, icon: TrendingUp, key: false },
    { label: "at 500K", count: creators.filter((c) => c.total >= GOAL).length, icon: Trophy, key: true },
  ];

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <h1 className="text-[1.75rem] leading-tight font-bold tracking-[-0.025em] sm:text-[2.5rem]">
          Race to <span className="text-primary">500K</span>
        </h1>
        <div className="panel-dark flex items-center gap-4 rounded-2xl px-5 py-3.5">
          <span className="font-mono text-[2.75rem] leading-none font-semibold tracking-[-0.04em] text-primary tabular-nums">
            {fmt(creators.length)}
          </span>
          <span className="border-l border-hairline pl-4 text-sm leading-tight font-semibold text-foreground">
            {creators.length === 1 ? "creator" : "creators"}
            <br />
            racing
          </span>
        </div>
      </header>

      <LeaderboardTable
        creators={creators}
        extras={
          // Add-on stats: small chips, so the table stays the focus.
          <ul aria-label="Board stats" className="flex flex-wrap items-center gap-2">
            {stats.map(({ label, count, icon: Icon, key }) => (
              <li key={label} className="flex h-9 items-center gap-2 rounded-lg border border-hairline px-3">
                <Icon className={cn("size-3.5", key ? "text-primary" : "text-muted-foreground")} aria-hidden />
                <span className={cn("font-mono text-sm font-semibold", key && "text-primary")}>{fmt(count)}</span>
                <span className="text-xs text-muted-foreground">{label}</span>
                <span
                  className="block h-1 w-10 overflow-hidden rounded-full bg-surface-highest"
                  role="img"
                  aria-label={`${fmt(count)} of ${fmt(creators.length)} creators`}
                >
                  <div
                    className={cn("h-full rounded-full", key ? "bg-primary" : "bg-foreground/60")}
                    style={{ width: `${count ? Math.max((count / of) * 100, 6) : 0}%` }}
                  />
                </span>
              </li>
            ))}
          </ul>
        }
      />
    </div>
  );
}
