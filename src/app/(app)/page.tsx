import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { EntriesTable } from "@/components/progress/entries-table";
import { GoalTrack } from "@/components/progress/goal-track";
import { ShareDialog } from "@/components/progress/share-dialog";
import { TrajectoryChart } from "@/components/progress/trajectory-chart";
import { getProgress } from "@/lib/data";
import { getOrigin, getRank } from "@/lib/public";
import { fmt, fmtDate, fmtPct, fmtSigned, fmtSignedPct } from "@/lib/format";
import { GOAL } from "@/lib/progress";
import { FirstLogPrompt, PageSkeleton } from "@/components/progress/page-skeleton";
import { cn } from "@/lib/utils";

export default function OverviewPage() {
  return (
    <Suspense fallback={<PageSkeleton blocks={["h-[72px]", "h-[132px]", "h-[200px]", "h-[420px]"]} />}>
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
      <div className="flex flex-col gap-6 lg:gap-8">
        <h1 className="text-[1.75rem] leading-tight font-bold tracking-[-0.025em] sm:text-[2rem]">Welcome, {firstName}</h1>
        <FirstLogPrompt
          title="Your road to 500K starts with one number"
          body="Open X analytics, copy your total impressions, and log it. From the second day on you'll see your daily gain, your pace, and when you'll reach 500K."
        />
      </div>
    );
  }

  const remaining = Math.max(0, GOAL - latest.total);
  const loggedToday = latest.date === p.today;

  const stats = [
    { label: "Total impressions", value: fmt(latest.total), note: `as of ${fmtDate(latest.date)}` },
    { label: "Of the 500K goal", value: fmtPct(latest.progressPct, 2), note: `${fmt(remaining)} to go` },
    {
      label: "Latest daily gain",
      value: latest.delta === null ? "—" : fmtSigned(latest.delta),
      note: latest.growthPct === null ? "first log" : `${fmtSignedPct(latest.growthPct, 2)} vs. previous day`,
      key: true,
    },
    { label: "7-day pace", value: fmtSigned(p.pace7), note: "impressions per day" },
  ];

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[1.75rem] leading-tight font-bold tracking-[-0.025em] sm:text-[2rem]">
            Welcome back, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-mono">@{profile.handle}</span> ·{" "}
            {loggedToday ? "Today is logged" : "Today isn't logged yet"} ·{" "}
            <span className="font-mono">{p.streak}</span>-day streak
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <ShareDialog
            handle={profile.handle ?? ""}
            total={latest.total}
            delta={latest.delta}
            streak={p.streak}
            rank={rank}
            shareUrl={`${origin}/u/${profile.handle}`}
          />
          <Link
            href="/progress"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_6px_20px_-6px_#c8f43266] transition-colors hover:bg-primary-hover active:bg-primary-pressed"
          >
            <Plus className="size-4" strokeWidth={2.5} />
            {loggedToday ? "Update today's log" : "Log today's impressions"}
          </Link>
        </div>
      </section>

      {/* KPI strip: one white panel, not four cards */}
      <section aria-label="Key numbers" className="panel-dark grid grid-cols-2 rounded-2xl lg:grid-cols-4">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={cn(
              "flex flex-col gap-1 p-4 sm:p-6",
              i % 2 === 1 && "border-l border-hairline",
              i >= 2 && "border-t border-hairline lg:border-t-0",
              i === 2 && "lg:border-l",
            )}
          >
            <span className="text-xs font-medium text-muted-foreground sm:text-sm">{s.label}</span>
            <span
              className={cn(
                "font-mono text-[1.375rem] leading-tight font-semibold tracking-[-0.04em] sm:text-[2rem]",
              )}
            >
              {s.key ? (
                <span className="text-primary">{s.value}</span>
              ) : (
                s.value
              )}
            </span>
            <span className="text-xs text-muted-foreground">{s.note}</span>
          </div>
        ))}
      </section>

      {/* Road to 500K */}
      <section className="panel-dark rounded-2xl p-5 sm:p-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <h2 className="text-xl font-bold tracking-[-0.015em]">Road to 500,000</h2>
          <p className="text-sm text-muted-foreground lg:text-right">
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
      <section className="panel-dark rounded-2xl p-5 sm:p-8">
        <div className="mb-8 flex items-baseline justify-between gap-4">
          <h2 className="text-xl font-bold tracking-[-0.015em]">Cumulative impressions</h2>
          <Link
            href="/analytics"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Analytics <ArrowRight className="size-4" />
          </Link>
        </div>
        <TrajectoryChart rows={p.rows} eta={p.eta} />
      </section>

      {/* Recent logs */}
      <section className="panel-dark rounded-2xl p-5 sm:p-8">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-[-0.015em]">Recent logs</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {p.rows.length} days logged since {fmtDate(p.rows[0].date)}
            </p>
          </div>
          <Link
            href="/progress"
            className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-foreground underline-offset-4 hover:underline"
          >
            All logs <ArrowRight className="size-4" />
          </Link>
        </div>
        <EntriesTable rows={p.rows} limit={5} />
      </section>
    </div>
  );
}
