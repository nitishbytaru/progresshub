import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/progress/page-skeleton";
import { getFinishDates, getLeaderboard, getToday, getViewer } from "@/lib/data";
import { Users } from "lucide-react";
import { fmt } from "@/lib/format";
import { GOAL } from "@/lib/progress";
import { FinishersDialog, type Finisher } from "./finishers-dialog";
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
  // At 500K the race is finished: those creators leave the table and appear in the finishers list.
  const finishedRows = rows.filter((r) => r.total >= GOAL);
  const finishDates = await getFinishDates(finishedRows.map((r) => r.user_id));
  const finishers: Finisher[] = finishedRows
    .map((r) => ({
      name: r.display_name || r.handle,
      handle: r.handle,
      total: r.total,
      avatarUrl: r.avatar_url,
      isYou: r.user_id === profile.id,
      finishedOn: finishDates[r.user_id] ?? r.last_logged_on,
    }))
    .sort((a, b) => (a.finishedOn ?? "").localeCompare(b.finishedOn ?? "") || b.total - a.total);

  const creators: Creator[] = rows.filter((r) => r.total < GOAL).map((r) => ({
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
    <LeaderboardTable
      creators={creators}
      today={today}
      finishers={<FinishersDialog finishers={finishers} />}
      count={
        // Phones: number + people icon only. sm and up: number + "creators racing".
        <div
          aria-label={`${fmt(creators.length)} ${creators.length === 1 ? "creator" : "creators"} racing`}
          className="panel-dark flex h-11 items-center gap-2 rounded-xl px-3 sm:h-auto sm:gap-4 sm:rounded-2xl sm:px-5 sm:py-3.5"
        >
          <Users className="size-4 text-muted-foreground sm:hidden" aria-hidden />
          <span className="font-mono text-lg sm:text-[2.75rem] leading-none font-semibold tracking-[-0.04em] text-primary tabular-nums">
            {fmt(creators.length)}
          </span>
          <span aria-hidden className="hidden border-l border-hairline pl-4 text-sm leading-tight font-semibold text-foreground sm:block">
            {creators.length === 1 ? "creator" : "creators"}
            <br /> racing
          </span>
        </div>
      }
    />
  );
}
