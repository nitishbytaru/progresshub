import { FirstLogPrompt } from "@/components/progress/page-skeleton";
import { GainHeatmap } from "@/components/progress/gain-heatmap";
import { TargetDateCard } from "@/components/progress/target-date-card";
import { TrajectoryChart } from "@/components/progress/trajectory-chart";
import type { Progress } from "@/lib/data";
import { fmtDate, fmtSigned } from "@/lib/format";

/** The Analytics screen for one creator's progress. Pure: the page loads the data. */
export function AnalyticsView({ p, origin }: { p: Progress; origin: string }) {
  const { latest, rows } = p;
  if (!latest || rows.length < 2) {
    return (
      <div className="flex flex-col gap-6 lg:gap-8">
        <h1 className="text-[1.75rem] leading-tight font-bold tracking-[-0.025em] sm:text-[2rem]">Analytics</h1>
        <FirstLogPrompt
          title={latest ? "One more day and the forecast unlocks" : "Nothing to analyse yet"}
          body="Projections need at least two days of logs to measure your pace. Log today, then come back tomorrow."
        />
      </div>
    );
  }

  const scenarios = [
    { label: "At your 7-day pace", pace: p.pace7, eta: p.eta, primary: true },
    { label: "At your 28-day pace", pace: p.pace28, eta: p.etaSlow },
  ];

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <header>
        <h1 className="text-[1.75rem] leading-tight font-bold tracking-[-0.025em] sm:text-[2rem]">Analytics</h1>
        <p className="mt-1 max-w-[60ch] text-sm text-muted-foreground">
          Projections assume your pace stays the same. They&apos;re estimates, not promises.
        </p>
      </header>

      {/* Bento row 1: forecast (wide) + deadline picker */}
      <div className="grid gap-6 xl:grid-cols-3">
      <section className="panel-dark rounded-2xl p-5 sm:p-6 xl:col-span-2">
        <h2 className="text-xl font-bold tracking-[-0.015em]">When you&apos;ll reach 500K</h2>
        <dl className="mt-5 grid divide-y divide-hairline rounded-xl border border-hairline sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          {scenarios.map((s) => (
            <div key={s.label} className="p-4 sm:p-5">
              <dt className="text-sm text-muted-foreground">{s.label}</dt>
              <dd className="mt-1.5">
                <span className={`font-mono text-2xl font-semibold tracking-[-0.03em] ${s.primary ? "text-primary" : ""}`}>
                  {s.eta ? fmtDate(s.eta.etaDate) : "—"}
                </span>
                <span className="mt-1 block font-mono text-xs text-subtle">
                  {fmtSigned(s.pace)}/day{s.eta ? ` · ${s.eta.daysLeft} days` : ""}
                </span>
              </dd>
            </div>
          ))}
        </dl>
        <div className="mt-8">
          <TrajectoryChart rows={rows} eta={p.eta} pace={p.pace7} etaSlow={p.etaSlow} paceSlow={p.pace28} />
        </div>
      </section>
      <TargetDateCard total={latest.total} from={latest.date} today={p.today}
        share={p.profile.handle ? { handle: p.profile.handle, origin } : undefined}
      />
      </div>

      <section className="panel-dark rounded-2xl p-5 sm:p-6">
        <h2 className="mb-5 text-xl font-bold tracking-[-0.015em]">Daily gains</h2>
        <GainHeatmap rows={rows} today={p.today} />
      </section>
    </div>
  );
}
