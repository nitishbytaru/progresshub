import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/progress/page-skeleton";
import { getLeaderboard, getToday, getViewer } from "@/lib/data";
import { fmt } from "@/lib/format";
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
  const [rows, { profile }, today] = await Promise.all([getLeaderboard(), getViewer(), getToday()]);
  const creators: Creator[] = rows.map((r) => ({
    name: r.display_name || r.handle,
    handle: r.handle,
    total: r.total,
    pace7: r.pace7,
    streak: r.streak,
    avatarUrl: r.avatar_url,
    isYou: r.user_id === profile.id,
    lastGain: r.last_gain,
    lastLoggedOn: r.last_logged_on,
  }));

  return (
    <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8">
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <h1 className="sr-only sm:not-sr-only text-[1.75rem] leading-tight font-bold tracking-[-0.025em] sm:text-[2.5rem]">
          Race to <span className="text-primary">500K</span>
        </h1>
        <div className="panel-dark flex items-center gap-3 rounded-2xl px-4 py-2 sm:gap-4 sm:px-5 sm:py-3.5">
          <span className="font-mono text-2xl sm:text-[2.75rem] leading-none font-semibold tracking-[-0.04em] text-primary tabular-nums">
            {fmt(creators.length)}
          </span>
          <span className="border-l border-hairline pl-4 text-sm leading-tight font-semibold text-foreground">
            {creators.length === 1 ? "creator" : "creators"}
            <br className="hidden sm:block" /> racing
          </span>
        </div>
      </header>

      <LeaderboardTable creators={creators} today={today} />
    </div>
  );
}
