import { FirstLogPrompt } from "@/components/progress/page-skeleton";
import { GainHeatmap } from "@/components/progress/gain-heatmap";
import { TargetDateCard } from "@/components/progress/target-date-card";
import { TrajectoryChart } from "@/components/progress/trajectory-chart";
import type { Progress } from "@/lib/data";
import { fmt, fmtDate, fmtPct, fmtSigned } from "@/lib/format";
import { daysBetween } from "@/lib/progress";

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

      {/* Bento row 1: forecast (wide) + deadline picker */}
      <div className="grid gap-6 lg:grid-cols-3">
      <section className="panel-dark rounded-2xl p-5 sm:p-6 lg:col-span-2">
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

      {/* Bento row 2: consistency + daily gains */}
      <div className="grid gap-6 lg:grid-cols-3">
      <section aria-labelledby="consistency-title" className="panel-dark flex flex-col rounded-2xl p-5 sm:p-6">
        <h2 id="consistency-title" className="text-xl font-bold tracking-[-0.015em]">Consistency</h2>
        <dl className="mt-3 flex flex-1 flex-col justify-between divide-y divide-hairline">
          {[
            {
              label: "Current streak",
              value: <span className="text-primary">{p.streak}</span>,
              note: p.streak === 1 ? "day in a row" : "days in a row",
            },
            { label: "Days logged", value: fmtPct(consistency, 0), note: `${rows.length} of ${span} days` },
            {
              label: "Pace trend",
              value: (
                <>
                  {acceleration < 0 && <span aria-label="down">▼ </span>}
                  {fmtSigned(acceleration)}%
                </>
              ),
              note: "7-day vs. 28-day pace",
            },
            { label: "Gained since first log", value: fmt(latest.total - rows[0].total), note: `since ${fmtDate(rows[0].date)}` },
          ].map((s) => (
            <div key={s.label} className="flex items-center justify-between gap-4 py-4 first:pt-2 last:pb-0">
              <div className="min-w-0">
                <dt className="text-sm text-muted-foreground">{s.label}</dt>
                <dd className="mt-0.5 text-xs text-subtle">{s.note}</dd>
              </div>
              <dd className="shrink-0 font-mono text-[1.75rem] leading-none font-semibold tracking-[-0.04em]">{s.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="panel-dark rounded-2xl p-5 sm:p-6 lg:col-span-2">
        <h2 className="mb-5 text-xl font-bold tracking-[-0.015em]">Daily gains</h2>
        <GainHeatmap rows={rows} today={p.today} />
      </section>
      </div>
    </div>
  );
}
