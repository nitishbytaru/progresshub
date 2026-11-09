import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, Check, Circle, Plus } from "lucide-react";
import { GoalTrack } from "@/components/progress/goal-track";
import { ShareDialog } from "@/components/progress/share-dialog";
import { TrajectoryChart } from "@/components/progress/trajectory-chart";
import { getProgress } from "@/lib/data";
import { cardPath, cardVersion, getOrigin, getRank } from "@/lib/public";
import { fmtDate } from "@/lib/format";
import { FirstLogPrompt, PageSkeleton } from "@/components/progress/page-skeleton";

export default function OverviewPage() {
  return (
    <Suspense fallback={<PageSkeleton blocks={["h-[72px]", "h-[200px]", "h-[420px]"]} />}>
      <Overview />
    </Suspense>
  );
}

async function Overview() {
  const p = await getProgress();
  const { latest, profile } = p;
  const [rank, origin] = await Promise.all([getRank(profile.id), getOrigin()]);
  const name = profile.display_name || profile.handle || "there";
  const firstName = name.split(" ")[0];

  if (!latest) {
    return (
      <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8">
        <h1 className="sr-only sm:not-sr-only text-[1.75rem] leading-tight font-bold tracking-[-0.025em] sm:text-[2rem]">Welcome, {firstName}</h1>
        <FirstLogPrompt
          title="Your road to 500K starts with one number"
          body="Open X analytics, copy your total impressions, and log it. From the second day on you'll see your daily gain, your pace, and when you'll reach 500K."
        />
      </div>
    );
  }

  const loggedToday = latest.date === p.today;

  return (
    <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8">
      <section className="flex items-center justify-between gap-3 sm:items-end sm:gap-5">
        <div>
          <h1 className="sr-only text-[2rem] leading-tight font-bold tracking-[-0.025em] sm:not-sr-only">
            Welcome back, {firstName}
          </h1>
          <p
            className="flex items-center gap-2.5 font-mono text-xs text-muted-foreground sm:hidden"
            aria-label={`${loggedToday ? "Today is logged" : "Today isn't logged yet"}, ${p.streak}-day streak`}
          >
            <span className={loggedToday ? "flex items-center gap-1 text-primary" : "flex items-center gap-1"}>
              {loggedToday ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : <Circle className="size-3" aria-hidden />}
              Today
            </span>
            <span aria-hidden className="h-3 w-px bg-hairline" />
            <span>
              <span className="font-semibold text-foreground">{p.streak}d</span> streak
            </span>
          </p>
          <p className="mt-1 hidden text-sm text-muted-foreground sm:block">
            <span className="font-mono">@{profile.handle}</span> ·{" "}
            {loggedToday ? "Today is logged" : "Today isn't logged yet"} ·{" "}
            <span className="font-mono">{p.streak}</span>-day streak
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <ShareDialog
            handle={profile.handle ?? ""}
            total={latest.total}
            delta={latest.delta}
            streak={p.streak}
            rank={rank}
            // ?v changes with the numbers on the card. X caches previews per link, so a new link = a fresh card.
            shareUrl={`${origin}/u/${profile.handle}?v=${encodeURIComponent(cardVersion({ latest, streak: p.streak, rank }))}`}
            imagePath={cardPath(profile.handle ?? "", cardVersion({ latest, streak: p.streak, rank }))}
          />
          <Link
            href="/progress"
            aria-label={loggedToday ? "Update today's log" : "Log today's impressions"}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 sm:px-5 text-sm font-semibold text-primary-foreground shadow-[0_6px_20px_-6px_#c8f43266] transition-colors hover:bg-primary-hover active:bg-primary-pressed"
          >
            <Plus className="size-4" strokeWidth={2.5} />
            <span className="sm:hidden">{loggedToday ? "Update" : "Log"}</span>
            <span className="hidden sm:inline">{loggedToday ? "Update today's log" : "Log today's impressions"}</span>
          </Link>
        </div>
      </section>

      {/* Road to 500K */}
      <section className="panel-dark rounded-2xl p-4 sm:p-8">
        <div className="flex items-baseline justify-between gap-3 sm:flex-col sm:items-start lg:flex-row lg:justify-between">
          <h2 className="text-xl font-bold tracking-[-0.015em]">
            Road to <span className="sm:hidden">500K</span>
            <span className="hidden sm:inline">500,000</span>
          </h2>
          <p
            className="font-mono text-xs whitespace-nowrap text-muted-foreground sm:hidden"
            aria-label={p.eta ? `At your 7-day pace you reach 500K around ${fmtDate(p.eta.etaDate)}` : "Log a few more days to see when you'll reach 500K"}
          >
            {p.eta ? <span className="font-semibold text-primary">{fmtDate(p.eta.etaDate)}</span> : "needs more logs"}
          </p>
          <p className="hidden text-sm text-muted-foreground sm:block lg:text-right">
            {p.eta ? (
              <>
                At your 7-day pace you reach 500K in{" "}
                <span className="font-mono font-semibold text-foreground">{p.eta.daysLeft} days</span>
                <br className="hidden lg:block" /> around{" "}
                <span className="font-mono font-semibold text-primary">{fmtDate(p.eta.etaDate)}</span>
              </>
            ) : (
              "Log a few more days to see when you'll reach 500K."
            )}
          </p>
        </div>
        <GoalTrack total={latest.total} milestones={p.milestones} />
      </section>

      {/* Trajectory */}
      <section className="panel-dark rounded-2xl p-4 sm:p-8">
        <div className="mb-5 flex items-baseline justify-between gap-4 sm:mb-8">
          <h2 className="text-xl font-bold tracking-[-0.015em]">
            <span className="sm:hidden">Impressions</span>
            <span className="hidden sm:inline">Cumulative impressions</span>
          </h2>
          <Link
            href="/analytics"
            className="-my-2 inline-flex items-center gap-1 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Analytics <ArrowRight className="size-4" />
          </Link>
        </div>
        <TrajectoryChart rows={p.rows} eta={p.eta} pace={p.pace7} projection={false} />
      </section>

    </div>
  );
}
