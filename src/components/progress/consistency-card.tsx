import { fmt, fmtCompact, fmtDateShort, fmtPct, fmtSigned } from "@/lib/format";
import { addDays, daysBetween, GOAL, type DayRow } from "@/lib/progress";
import { cn } from "@/lib/utils";

const RECENT_DAYS = 14;

type Props = {
  rows: DayRow[];
  today: string;
  streak: number;
  pace7: number;
  pace28: number;
};

/** Four consistency numbers, each explained by a small picture instead of a sentence. */
export function ConsistencyCard({ rows, today, streak, pace7, pace28 }: Props) {
  const first = rows[0];
  const latest = rows[rows.length - 1];
  const span = daysBetween(first.date, today) + 1;
  const loggedPct = Math.min(100, (rows.length / span) * 100);
  const trend = pace28 > 0 ? (pace7 / pace28 - 1) * 100 : 0;
  const paceMax = Math.max(pace7, pace28, 1);
  const logged = new Set(rows.map((r) => r.date));
  const recent = Array.from({ length: RECENT_DAYS }, (_, i) => addDays(today, i - RECENT_DAYS + 1));
  const startPct = Math.min(100, (first.total / GOAL) * 100);
  const nowPct = Math.min(100, (latest.total / GOAL) * 100);

  return (
    <section aria-labelledby="consistency-title" className="panel-dark flex flex-col rounded-2xl p-4 sm:p-6">
      <h2 id="consistency-title" className="text-xl font-bold tracking-[-0.015em]">
        Consistency
      </h2>
      <dl className="mt-3 flex flex-1 flex-col justify-between divide-y divide-hairline">
        {/* Streak: the last two weeks, one square per day */}
        <Stat label="Streak" value={<span className="text-primary">{streak}</span>} unit={streak === 1 ? "day" : "days"}>
          <div className="flex gap-1" role="img" aria-label={`Logged ${recent.filter((d) => logged.has(d)).length} of the last ${RECENT_DAYS} days`}>
            {recent.map((d) => (
              <span
                key={d}
                title={fmtDateShort(d)}
                className={cn(
                  "h-2.5 flex-1 rounded-[3px]",
                  logged.has(d) ? "bg-primary" : "bg-surface-highest",
                  d === today && "ring-1 ring-foreground ring-offset-1 ring-offset-background",
                )}
              />
            ))}
          </div>
        </Stat>

        {/* Logged: share of days since the first log */}
        <Stat label="Logged" value={fmtPct(loggedPct, 0)}>
          <div className="flex items-center gap-3">
            <Bar pct={loggedPct} />
            <span className="shrink-0 font-mono text-xs text-subtle">
              {rows.length}/{span}
            </span>
          </div>
        </Stat>

        {/* Pace: last 7 days against last 28 */}
        <Stat
          label="Pace trend"
          value={
            <>
              {trend < 0 && <span aria-label="down">▼ </span>}
              {fmtSigned(trend)}%
            </>
          }
        >
          <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_3.5rem] items-center gap-x-3 gap-y-1.5 font-mono text-xs">
            <span className="text-subtle">7d</span>
            <Bar pct={(pace7 / paceMax) * 100} />
            <span className="text-right text-foreground">+{fmtCompact(pace7)}</span>
            <span className="text-subtle">28d</span>
            <Bar pct={(pace28 / paceMax) * 100} dim />
            <span className="text-right text-muted-foreground">+{fmtCompact(pace28)}</span>
          </div>
        </Stat>

        {/* Gained: the stretch of the 500K road covered since the first log */}
        <Stat label="Gained" value={fmt(latest.total - first.total)}>
          <div className="flex items-center gap-3">
            <div
              className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-surface-highest"
              role="img"
              aria-label={`From ${fmt(first.total)} to ${fmt(latest.total)} of 500,000`}
            >
              <span className="absolute inset-y-0 left-0 bg-foreground/30" style={{ width: `${startPct}%` }} />
              <span
                className="absolute inset-y-0 rounded-r-full bg-primary"
                style={{ left: `${startPct}%`, width: `${Math.max(nowPct - startPct, 1)}%` }}
              />
            </div>
            <span className="shrink-0 font-mono text-xs text-subtle">since {fmtDateShort(first.date)}</span>
          </div>
        </Stat>
      </dl>
    </section>
  );
}

function Stat({
  label,
  value,
  unit,
  children,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5 py-4 first:pt-2 last:pb-0">
      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-sm text-muted-foreground">{label}</dt>
        <dd className="font-mono text-[1.75rem] leading-none font-semibold tracking-[-0.04em]">
          {value}
          {unit && <span className="ml-1.5 font-sans text-sm font-medium tracking-normal text-muted-foreground">{unit}</span>}
        </dd>
      </div>
      <dd>{children}</dd>
    </div>
  );
}

function Bar({ pct, dim }: { pct: number; dim?: boolean }) {
  return (
    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-highest" aria-hidden>
      <div
        className={cn("h-full rounded-full", dim ? "bg-foreground/50" : "bg-primary")}
        style={{ width: `${Math.max(0, Math.min(pct, 100))}%` }}
      />
    </div>
  );
}
