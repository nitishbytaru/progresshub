import { FirstLogPrompt } from "@/components/progress/page-skeleton";
import { GainHeatmap } from "@/components/progress/gain-heatmap";
import { TrajectoryChart } from "@/components/progress/trajectory-chart";
import type { Progress } from "@/lib/data";
import { fmt, fmtDate, fmtPct, fmtSigned } from "@/lib/format";
import { daysBetween, GOAL } from "@/lib/progress";

/** The Analytics screen for one creator's progress. Pure: the page loads the data. */
export function AnalyticsView({ p }: { p: Progress }) {
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
  const remaining = Math.max(0, GOAL - latest.total);
  const yearEnd = `${latest.date.slice(0, 4)}-12-31`;
  const daysToYearEnd = Math.max(1, daysBetween(latest.date, yearEnd));
  const neededForYearEnd = remaining / daysToYearEnd;
  const span = daysBetween(rows[0].date, p.today) + 1;
  const consistency = (rows.length / span) * 100;
  const acceleration = p.pace28 > 0 ? (p.pace7 / p.pace28 - 1) * 100 : 0;

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

      {/* Forecast: the three answers in one row, the chart full width below */}
      <section className="panel-dark rounded-2xl p-5 sm:p-8">
        <h2 className="text-xl font-bold tracking-[-0.015em]">When you&apos;ll reach 500K</h2>
        <dl className="mt-5 grid divide-y divide-hairline rounded-xl border border-hairline sm:grid-cols-3 sm:divide-x sm:divide-y-0">
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
          <div className="p-4 sm:p-5">
            <dt className="text-sm text-muted-foreground">To hit 500K by {fmtDate(yearEnd)}</dt>
            <dd className="mt-1.5">
              <span className="font-mono text-2xl font-semibold tracking-[-0.03em]">{fmtSigned(neededForYearEnd)}</span>
              <span className="mt-1 block font-mono text-xs text-subtle">
                per day for {daysToYearEnd} days
                {p.pace7 >= neededForYearEnd ? " · you're on track" : ""}
              </span>
            </dd>
          </div>
        </dl>
        <div className="mt-8">
          <TrajectoryChart rows={rows} eta={p.eta} pace={p.pace7} etaSlow={p.etaSlow} paceSlow={p.pace28} />
        </div>
      </section>

      {/* Consistency: one strip, four numbers */}
      <section aria-labelledby="consistency-title" className="panel-dark rounded-2xl p-5 sm:p-8">
        <h2 id="consistency-title" className="text-xl font-bold tracking-[-0.015em]">Consistency</h2>
        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-6 lg:grid-cols-4 lg:divide-x lg:divide-hairline">
          <div className="lg:pr-6">
            <dt className="text-sm text-muted-foreground">Current streak</dt>
            <dd className="mt-1 font-mono text-[2rem] leading-tight font-semibold tracking-[-0.04em]">
              <span className="text-primary">{p.streak}</span>
              <span className="ml-1.5 font-sans text-sm font-medium tracking-normal text-muted-foreground">
                {p.streak === 1 ? "day" : "days"}
              </span>
            </dd>
          </div>
          <div className="lg:px-6">
            <dt className="text-sm text-muted-foreground">Days logged</dt>
            <dd className="mt-1 font-mono text-[2rem] leading-tight font-semibold tracking-[-0.04em]">{fmtPct(consistency, 0)}</dd>
            <dd className="text-xs text-muted-foreground">
              {rows.length} of {span} days
            </dd>
          </div>
          <div className="lg:px-6">
            <dt className="text-sm text-muted-foreground">Pace trend</dt>
            <dd className="mt-1 font-mono text-[2rem] leading-tight font-semibold tracking-[-0.04em]">
              {acceleration < 0 && <span aria-label="down">▼</span>}
              {fmtSigned(acceleration)}%
            </dd>
            <dd className="text-xs text-muted-foreground">7-day vs. 28-day pace</dd>
          </div>
          <div className="lg:pl-6">
            <dt className="text-sm text-muted-foreground">Gained since first log</dt>
            <dd className="mt-1 font-mono text-[2rem] leading-tight font-semibold tracking-[-0.04em]">
              {fmt(latest.total - rows[0].total)}
            </dd>
          </div>
        </dl>
      </section>

      {/* Heatmap */}
      <section className="panel-dark rounded-2xl p-5 sm:p-8">
        <h2 className="mb-5 text-xl font-bold tracking-[-0.015em]">Daily gains</h2>
        <GainHeatmap rows={rows} today={p.today} />
      </section>
    </div>
  );
}
