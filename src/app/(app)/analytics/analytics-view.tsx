import { FirstLogPrompt } from "@/components/progress/page-skeleton";
import { GainHeatmap } from "@/components/progress/gain-heatmap";
import { TargetDateCard } from "@/components/progress/target-date-card";
import { TrajectoryChart } from "@/components/progress/trajectory-chart";
import type { Progress } from "@/lib/data";
import { fmtDate, fmtSigned } from "@/lib/format";
import { EtaCardMobile } from "./eta-card-mobile";

/** The Analytics screen for one creator's progress. Pure: the page loads the data. */
export function AnalyticsView({ p, origin }: { p: Progress; origin: string }) {
  const { latest, rows } = p;
  if (!latest || rows.length < 2) {
    return (
      <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8">
        <h1 className="sr-only sm:not-sr-only text-[1.75rem] leading-tight font-bold tracking-[-0.025em] sm:text-[2rem]">Analytics</h1>
        <FirstLogPrompt
          title={latest ? "One more day and the forecast unlocks" : "Nothing to analyse yet"}
          body="Projections need at least two days of logs to measure your pace. Log today, then come back tomorrow."
          short="Needs 2 days of logs. Back tomorrow."
        />
      </div>
    );
  }

  const scenarios = [
    { label: "7", short: "7-day pace", pace: p.pace7, eta: p.eta, primary: true },
    { label: "28", short: "28-day pace", pace: p.pace28, eta: p.etaSlow },
  ];

  return (
    <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8">
      <header className="max-sm:absolute">
        <h1 className="sr-only sm:not-sr-only text-[1.75rem] leading-tight font-bold tracking-[-0.025em] sm:text-[2rem]">Analytics</h1>
        <p className="mt-1 hidden max-w-[60ch] sm:block text-sm text-muted-foreground">
          Projections assume your pace stays the same. They&apos;re estimates, not promises.
        </p>
      </header>

      {/* Bento row 1: forecast (wide) + deadline picker */}
      <div className="grid gap-4 sm:gap-6 xl:grid-cols-3">
      <section className="panel-dark rounded-2xl p-4 sm:p-6 xl:col-span-2">
        {/* Phones: one glanceable forecast with a 7d/28d menu. sm and up: both paces side by side. */}
        <EtaCardMobile
          scenarios={[
            { days: 7, pace: p.pace7, eta: p.eta ? { etaDate: p.eta.etaDate, daysLeft: p.eta.daysLeft } : null },
            { days: 28, pace: p.pace28, eta: p.etaSlow ? { etaDate: p.etaSlow.etaDate, daysLeft: p.etaSlow.daysLeft } : null },
          ]}
        />
        <h2 className="hidden text-xl font-bold tracking-[-0.015em] sm:block">When you&apos;ll reach 500K</h2>
        <dl className="mt-5 hidden grid-cols-2 divide-x divide-hairline rounded-xl border border-hairline sm:grid">
          {scenarios.map((s) => (
            <div key={s.label} className="p-3 sm:p-5">
              <dt className="text-sm text-muted-foreground"><span className="hidden sm:inline">At your </span>{s.short}</dt>
              <dd className="mt-1.5">
                <span className={`font-mono text-base font-semibold tracking-[-0.03em] sm:text-2xl ${s.primary ? "text-primary" : ""}`}>
                  {s.eta ? fmtDate(s.eta.etaDate) : "—"}
                </span>
                <span className="mt-1 block font-mono text-xs text-subtle">
                  {fmtSigned(s.pace)}/day{s.eta ? ` · ${s.eta.daysLeft} days` : ""}
                </span>
              </dd>
            </div>
          ))}
        </dl>
        <div className="mt-5 sm:mt-8">
          <TrajectoryChart rows={rows} eta={p.eta} pace={p.pace7} etaSlow={p.etaSlow} paceSlow={p.pace28} />
        </div>
      </section>
      <TargetDateCard total={latest.total} from={latest.date} today={p.today}
        share={p.profile.handle ? { handle: p.profile.handle, origin } : undefined}
      />
      </div>

      <section className="panel-dark rounded-2xl p-4 sm:p-6">
        <h2 className="mb-5 text-xl font-bold tracking-[-0.015em]">Daily gains</h2>
        <GainHeatmap rows={rows} today={p.today} />
      </section>
    </div>
  );
}
