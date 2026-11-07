import type { Metadata } from "next";
import { GainHeatmap } from "@/components/progress/gain-heatmap";
import { TrajectoryChart } from "@/components/progress/trajectory-chart";
import { getProgress } from "@/lib/data";
import { fmt, fmtDate, fmtPct, fmtSigned } from "@/lib/format";
import { daysBetween, GOAL } from "@/lib/progress";

export const metadata: Metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  const p = getProgress();
  const { latest, rows } = p;
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

      {/* Forecast */}
      <section className="panel-dark rounded-2xl p-5 sm:p-8">
        <h2 className="text-xl font-bold tracking-[-0.015em]">When you&apos;ll reach 500K</h2>
        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
          <TrajectoryChart rows={rows} eta={p.eta} etaSlow={p.etaSlow} />
          <dl className="flex flex-col divide-y divide-hairline">
            {scenarios.map((s) => (
              <div key={s.label} className="py-4 first:pt-0">
                <dt className="text-sm text-muted-foreground">{s.label}</dt>
                <dd className="mt-1">
                  <span
                    className={`font-mono text-2xl font-semibold tracking-[-0.03em] ${s.primary ? "text-primary" : ""}`}
                  >
                    {s.eta ? fmtDate(s.eta.etaDate) : "—"}
                  </span>
                  <span className="mt-0.5 block font-mono text-xs text-subtle">
                    {fmtSigned(s.pace)}/day{s.eta ? ` · ${s.eta.daysLeft} days` : ""}
                  </span>
                </dd>
              </div>
            ))}
            <div className="py-4">
              <dt className="text-sm text-muted-foreground">To hit 500K by {fmtDate(yearEnd)}</dt>
              <dd className="mt-1">
                <span className="font-mono text-2xl font-semibold tracking-[-0.03em]">
                  {fmtSigned(neededForYearEnd)}
                </span>
                <span className="mt-0.5 block font-mono text-xs text-subtle">
                  per day for {daysToYearEnd} days
                  {p.pace7 >= neededForYearEnd ? " · you're on track" : ""}
                </span>
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-8">
        {/* Consistency */}
        <section className="panel-paper flex flex-col rounded-2xl p-5 sm:p-8">
          <h2 className="text-xl font-bold tracking-[-0.015em]">Consistency</h2>
          <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 lg:grid-cols-1">
            <div>
              <dt className="text-sm text-paper-muted">Current streak</dt>
              <dd className="mt-1 font-mono text-[2rem] leading-tight font-semibold tracking-[-0.04em]">
                <span className="rounded-md bg-primary px-1.5">{p.streak}</span>
                <span className="ml-1.5 font-sans text-sm font-medium tracking-normal text-paper-muted">days</span>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-paper-muted">Days logged</dt>
              <dd className="mt-1 font-mono text-[2rem] leading-tight font-semibold tracking-[-0.04em]">
                {fmtPct(consistency, 0)}
              </dd>
              <dd className="text-xs text-paper-muted">
                {rows.length} of {span} days
              </dd>
            </div>
            <div>
              <dt className="text-sm text-paper-muted">Pace trend</dt>
              <dd className="mt-1 font-mono text-[2rem] leading-tight font-semibold tracking-[-0.04em]">
                {acceleration < 0 && <span aria-label="down">▼</span>}
                {fmtSigned(acceleration)}%
              </dd>
              <dd className="text-xs text-paper-muted">7-day vs. 28-day pace</dd>
            </div>
            <div>
              <dt className="text-sm text-paper-muted">Gained since first log</dt>
              <dd className="mt-1 font-mono text-[2rem] leading-tight font-semibold tracking-[-0.04em]">
                {fmt(latest.total - rows[0].total)}
              </dd>
            </div>
          </dl>
        </section>

        {/* Heatmap */}
        <section className="panel-dark rounded-2xl p-5 sm:p-8">
          <h2 className="mb-6 text-xl font-bold tracking-[-0.015em]">Daily gains</h2>
          <GainHeatmap rows={rows} today={p.today} />
        </section>
      </div>
    </div>
  );
}
