import { Fragment } from "react";
import { fmt, fmtCompact, fmtDateShort, fmtSigned } from "@/lib/format";
import { addDays, daysBetween, type DayRow } from "@/lib/progress";
import { cn } from "@/lib/utils";
import { CountUp } from "./count-up";
import { InView } from "./in-view";

/** When the first bar starts filling after the card scrolls in (ms). */
const BARS_AT = 150;

type Props = { rows: DayRow[]; today: string };

/** Sum of daily gains on days in [from, to]. */
const gainedBetween = (rows: DayRow[], from: string, to: string) =>
  rows.reduce((sum, r) => (r.delta !== null && r.date >= from && r.date <= to ? sum + r.delta : sum), 0);

/**
 * Momentum: three rows, one number each with a small bar picture under it. On scroll-in
 * the bars fill one after another and the numbers count up.
 * (The file keeps its old name because CLAUDE.md points at it as the pattern to follow.)
 */
export function MomentumCard({ rows, today }: Props) {
  const latest = rows[rows.length - 1];
  const gains = rows.filter((r) => r.delta !== null).map((r) => r.delta!);
  const avg = gains.length ? gains.reduce((a, b) => a + b, 0) / gains.length : 0;

  // This week vs the week before.
  const thisWeek = gainedBetween(rows, addDays(today, -6), today);
  const lastWeek = gainedBetween(rows, addDays(today, -13), addDays(today, -7));
  const weekMax = Math.max(thisWeek, lastWeek, 1);
  const weekTrend = lastWeek > 0 ? Math.round((thisWeek / lastWeek - 1) * 100) : null;

  // Daily average against the latest day.
  const latestGain = latest.delta ?? 0;
  const avgMax = Math.max(avg, latestGain, 1);

  // Doubled in: days since the total was last half of today's.
  const half = latest.total / 2;
  const halfRow = [...rows].reverse().find((r) => r.total <= half);
  const doubledDays = halfRow ? daysBetween(halfRow.date, latest.date) : null;

  return (
    <InView aria-labelledby="momentum-title" className="panel-dark flex flex-col rounded-2xl p-4 sm:p-6">
      <h2 id="momentum-title" className="text-xl font-bold tracking-[-0.015em]">
        Momentum
      </h2>
      <dl className="mt-3 flex flex-1 flex-col justify-between divide-y divide-hairline">
        {/* This week: last 7 days against the 7 before */}
        <Stat
          label="This week"
          value={
            weekTrend !== null ? (
              // Week over week: big ▲ lime when up, big ▼ red when down.
              <span
                className={cn(weekTrend > 0 ? "text-primary" : weekTrend < 0 ? "text-trend-down" : "text-foreground")}
                aria-label={`${weekTrend >= 0 ? "Up" : "Down"} ${Math.abs(weekTrend)}% on last week`}
              >
                {weekTrend > 0 ? "▲" : weekTrend < 0 ? "▼" : ""}
                <CountUp value={Math.abs(weekTrend)} />%
              </span>
            ) : (
              <>
                +<CountUp value={thisWeek} compact />
              </>
            )
          }
        >
          <Pair
            rows={[
              { label: "this wk", value: thisWeek, pct: (thisWeek / weekMax) * 100 },
              { label: "last wk", value: lastWeek, pct: (lastWeek / weekMax) * 100, dim: true },
            ]}
            delay={BARS_AT}
          />
        </Stat>

        {/* Daily average since joining, against the latest day */}
        <Stat
          label="Daily avg"
          value={
            <>
              +<CountUp value={avg} compact />
            </>
          }
          unit="/day"
        >
          <Pair
            rows={[
              { label: "latest", value: latestGain, pct: (latestGain / avgMax) * 100 },
              { label: "avg", value: avg, pct: (avg / avgMax) * 100, dim: true },
            ]}
            delay={BARS_AT + 240}
          />
        </Stat>

        {/* Doubled in: how long the total took to double */}
        <Stat
          label="Doubled in"
          value={doubledDays !== null ? <CountUp value={doubledDays} /> : "—"}
          unit={doubledDays !== null ? (doubledDays === 1 ? "day" : "days") : undefined}
        >
          {halfRow ? (
            <div className="flex items-center gap-3">
              <div
                className="flex h-1.5 flex-1 gap-0.5 overflow-hidden rounded-full"
                role="img"
                aria-label={`From ${fmt(halfRow.total)} on ${fmtDateShort(halfRow.date)} to ${fmt(latest.total)}`}
              >
                <span
                  className="reveal-anim animate-track-fill h-full flex-1 rounded-l-full bg-foreground/50"
                  style={{ animationDelay: `${BARS_AT + 480}ms` }}
                />
                <span
                  className="reveal-anim animate-track-fill h-full flex-1 rounded-r-full bg-primary"
                  style={{ animationDelay: `${BARS_AT + 700}ms` }}
                />
              </div>
              <span className="shrink-0 font-mono text-xs text-subtle">
                {fmtCompact(halfRow.total)} → {fmtCompact(latest.total)}
              </span>
            </div>
          ) : (
            <span className="font-mono text-xs text-subtle">not yet</span>
          )}
        </Stat>
      </dl>
    </InView>
  );
}

/** Two labelled bars on a shared scale, e.g. this week vs last week. */
function Pair({
  rows,
  delay,
}: {
  rows: { label: string; value: number; pct: number; dim?: boolean }[];
  delay: number;
}) {
  return (
    <div className="grid grid-cols-[3.5rem_minmax(0,1fr)_3rem] items-center gap-x-3 gap-y-2 font-mono text-xs">
      {rows.map((r, i) => (
        <Fragment key={r.label}>
          <span className={r.dim ? "text-subtle" : "text-muted-foreground"}>{r.label}</span>
          <Bar pct={r.pct} dim={r.dim} delay={delay + i * 120} label={`${r.label}: ${fmtSigned(r.value)}`} />
          <span className={cn("text-right", r.dim ? "text-muted-foreground" : "text-foreground")}>
            {r.value < 0 ? "▼" : "+"}
            {fmtCompact(Math.abs(Math.round(r.value)))}
          </span>
        </Fragment>
      ))}
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  tag,
  children,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  tag?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5 py-4 first:pt-2 last:pb-0">
      <div className="flex items-baseline justify-between gap-4">
        <dt className="flex items-baseline gap-2 text-sm text-muted-foreground">
          {label}
          {tag}
        </dt>
        <dd className="font-mono text-[1.75rem] leading-none font-semibold tracking-[-0.04em]">
          {value}
          {unit && <span className="ml-1 font-sans text-sm font-medium tracking-normal text-muted-foreground">{unit}</span>}
        </dd>
      </div>
      <dd>{children}</dd>
    </div>
  );
}

function Bar({ pct, dim, delay, label }: { pct: number; dim?: boolean; delay: number; label: string }) {
  return (
    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-highest" role="img" aria-label={label}>
      <div
        className={cn("reveal-anim animate-track-fill h-full rounded-full", dim ? "bg-foreground/50" : "bg-primary")}
        style={{ width: `${Math.max(0, Math.min(pct, 100))}%`, animationDelay: `${delay}ms` }}
      />
    </div>
  );
}
