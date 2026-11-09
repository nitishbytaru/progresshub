import { fmt, fmtCompact, fmtDate, fmtDateShort, fmtSigned } from "@/lib/format";
import { GOAL, addDays, daysBetween, type DayRow, type Forecast } from "@/lib/progress";
import { cn } from "@/lib/utils";

const W = 1000;
const H = 300;
/** Share of the plot height the daily-gain bars may use. */
const BAR_BAND = 0.28;

type Props = {
  rows: DayRow[];
  /** Projection at the 7-day pace. */
  eta: Forecast;
  pace: number;
  /** Optional slower projection (28-day pace), drawn fainter. */
  etaSlow?: Forecast;
  paceSlow?: number;
  /** false = history only (up to the latest log), no projection. */
  projection?: boolean;
  height?: string;
};

/** Rounds up to a readable axis maximum (1, 1.5, 2, 2.5, 3, 4, 5, 6 or 8 × 10ⁿ). */
function niceCeil(v: number) {
  if (v <= 0) return 1000;
  const exp = 10 ** Math.floor(Math.log10(v));
  const step = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((s) => s * exp >= v)!;
  return step * exp;
}

/**
 * Logged impressions (lime line + a dot per log), each day's gain (lime bars), and the
 * projection at the current pace (white, dashed). The window zooms to the creator's real
 * history plus a short look-ahead; it only stretches to 500K once 500K is close.
 */
export function TrajectoryChart({ rows, eta, pace, etaSlow, paceSlow, projection = true, height = "h-48 sm:h-80" }: Props) {
  const first = rows[0];
  const last = rows[rows.length - 1];
  const history = Math.max(1, daysBetween(first.date, last.date));

  // Look ahead ~60% of the history (at least a week). If 500K lands inside that, show it.
  const lookAhead = Math.max(7, Math.ceil(history * 0.6));
  const goalInView = projection && Boolean(eta && daysBetween(last.date, eta.etaDate) <= lookAhead * 2);
  const end = !projection ? last.date : goalInView && eta ? eta.etaDate : addDays(last.date, lookAhead);
  // History-only keeps a little room on the right so the latest bar and point aren't clipped.
  const span = projection ? Math.max(1, daysBetween(first.date, end)) : history + Math.max(0.3, history * 0.04);
  const projectAt = (p: number) => Math.min(GOAL, last.total + p * daysBetween(last.date, end));
  const projectedEnd = !projection ? last.total : goalInView ? GOAL : projectAt(pace);

  const yMax = goalInView ? GOAL * 1.06 : niceCeil(Math.max(projectedEnd, last.total) * 1.1);
  const ticks = [0.25, 0.5, 0.75, 1].map((f) => yMax * f);

  const x = (date: string) => (daysBetween(first.date, date) / span) * W;
  const y = (v: number) => H - (Math.min(v, yMax) / yMax) * H;
  const pctX = (date: string) => (x(date) / W) * 100;
  const pctY = (v: number) => (y(v) / H) * 100;

  const line = rows.map((r) => `${x(r.date).toFixed(1)},${y(r.total).toFixed(1)}`).join(" ");
  const area = `M ${x(first.date)},${H} L ${line.replaceAll(" ", " L ")} L ${x(last.date)},${H} Z`;

  // Daily gain bars, scaled to their own band at the bottom.
  const gains = rows.filter((r) => r.delta !== null && r.delta > 0);
  const maxGain = Math.max(1, ...gains.map((r) => r.delta!));
  const dayWidth = W / span;
  const barW = Math.max(2, Math.min(dayWidth * 0.55, 28));

  const slowEnd =
    !projection
      ? null
      : etaSlow && paceSlow !== undefined && paceSlow > 0 && !goalInView
      ? { date: end, value: projectAt(paceSlow) }
      : etaSlow && goalInView && etaSlow.etaDate <= end
        ? { date: etaSlow.etaDate, value: GOAL }
        : null;

  const showDots = rows.length <= 45;
  const startLabelCrowded = pctX(last.date) < 16;

  return (
    <figure className="m-0">
      <div className={`relative ${height}`}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 size-full overflow-visible"
          role="img"
          aria-label={`Impressions grew from ${fmt(first.total)} on ${fmtDate(first.date)} to ${fmt(last.total)} on ${fmtDate(last.date)}${
            eta ? `; at the current pace 500,000 is reached around ${fmtDate(eta.etaDate)}` : ""
          }.`}
        >
          <defs>
            <linearGradient id="traj-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#c8f432" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#c8f432" stopOpacity="0" />
            </linearGradient>
          </defs>

          {ticks.map((t) => (
            <line
              key={t}
              x1="0"
              x2={W}
              y1={y(t)}
              y2={y(t)}
              stroke={goalInView && t === yMax ? "transparent" : "#ffffff12"}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {goalInView && (
            <line x1="0" x2={W} y1={y(GOAL)} y2={y(GOAL)} stroke="#ffffff3d" strokeDasharray="6 6" vectorEffect="non-scaling-stroke" />
          )}
          <line x1="0" x2={W} y1={H} y2={H} stroke="#ffffff1f" vectorEffect="non-scaling-stroke" />

          {gains.map((r) => {
            const h = (r.delta! / maxGain) * H * BAR_BAND;
            return (
              <rect
                key={r.date}
                x={x(r.date) - barW / 2}
                y={H - h}
                width={barW}
                height={h}
                rx={Math.min(3, barW / 3)}
                fill="#c8f432"
                fillOpacity="0.28"
              />
            );
          })}

          {slowEnd && (
            <line
              x1={x(last.date)}
              y1={y(last.total)}
              x2={x(slowEnd.date)}
              y2={y(slowEnd.value)}
              stroke="#ffffff40"
              strokeWidth="1.5"
              strokeDasharray="3 6"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {projection && pace > 0 && (
            <line
              x1={x(last.date)}
              y1={y(last.total)}
              x2={x(end)}
              y2={y(projectedEnd)}
              stroke="#ffffff99"
              strokeWidth="2"
              strokeDasharray="7 7"
              vectorEffect="non-scaling-stroke"
            />
          )}

          <path d={area} fill="url(#traj-area)" />
          <polyline
            points={line}
            fill="none"
            stroke="#c8f432"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Y axis labels */}
        {/* Phones keep one label so the numbers never crowd the line. */}
        {ticks.map((t, i) => (
          <span
            key={t}
            className={cn(
              "pointer-events-none absolute right-0 -translate-y-[calc(100%+4px)] font-mono text-[11px] text-subtle",
              i !== 1 && "hidden sm:block",
            )}
            style={{ top: `${pctY(goalInView && t === yMax ? GOAL : t)}%` }}
          >
            {goalInView && t === yMax ? "500K" : fmtCompact(t)}
          </span>
        ))}

        {/* One dot per log, with the exact numbers on hover */}
        {showDots &&
          rows.slice(0, -1).map((r) => (
            <span
              key={r.date}
              title={`${fmtDate(r.date)}: ${fmt(r.total)}${r.delta !== null ? ` (${fmtSigned(r.delta)})` : ""}`}
              className={cn("absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary", rows.length > 14 && "hidden sm:block")}
              style={{ left: `${pctX(r.date)}%`, top: `${pctY(r.total)}%` }}
            />
          ))}

        {/* Latest point + label */}
        <span
          title={`${fmtDate(last.date)}: ${fmt(last.total)}${last.delta !== null ? ` (${fmtSigned(last.delta)})` : ""}`}
          className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-[2.5px] border-primary bg-background"
          style={{ left: `${pctX(last.date)}%`, top: `${pctY(last.total)}%` }}
        />
        <div
          className={cn(
            "pointer-events-none absolute rounded-lg border border-border bg-background px-2.5 py-1.5 font-mono text-[11px] whitespace-nowrap",
            projection ? "-translate-x-1/2 -translate-y-[calc(100%+14px)]" : "-translate-x-[calc(100%+10px)] -translate-y-[calc(100%+6px)]",
          )}
          style={{
            left: projection ? `clamp(4.5rem, ${pctX(last.date)}%, calc(100% - 4.5rem))` : `${pctX(last.date)}%`,
            top: `${pctY(last.total)}%`,
          }}
        >
          <span className="block text-subtle">
            {fmtDateShort(last.date)}
            {last.delta !== null && ` · ${fmtSigned(last.delta)}`}
          </span>
          <span className="font-semibold text-primary">{fmt(last.total)}</span>
        </div>

        {goalInView && eta && (
          <span
            className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-[2.5px] border-foreground bg-background"
            style={{ left: `${pctX(eta.etaDate)}%`, top: `${pctY(GOAL)}%` }}
          />
        )}
      </div>

      {/* X axis */}
      <div className="relative mt-3 h-4 font-mono text-[11px]">
        {!startLabelCrowded && <span className="absolute left-0 text-subtle">{fmtDateShort(first.date)}</span>}
        {projection ? (
          <span
            className="absolute hidden -translate-x-1/2 font-semibold text-primary sm:block"
            style={{ left: `clamp(1.5rem, ${pctX(last.date)}%, calc(100% - 1.5rem))` }}
          >
            Latest
          </span>
        ) : (
          <span
            className="absolute -translate-x-full font-semibold whitespace-nowrap text-primary"
            style={{ left: `calc(${pctX(last.date)}% + 0.75rem)` }}
          >
            {fmtDateShort(last.date)} · latest
          </span>
        )}
        {projection && (
          <span className="absolute right-0 text-muted-foreground">
            {fmtDateShort(end)}
            {goalInView ? " · 500K" : ""}
          </span>
        )}
      </div>

      <figcaption className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground sm:mt-5 sm:gap-x-5">
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-4 rounded bg-primary" /> Total<span className="-ml-1 hidden sm:inline">impressions</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2 rounded-sm bg-primary/30" /> <span className="sm:hidden">Daily</span><span className="hidden sm:inline">Gained that day</span>
        </span>
        {projection && pace > 0 && (
          <span className="flex items-center gap-2">
            <span className="w-4 border-t-2 border-dashed border-white/60" /> <span className="sm:hidden">7-day pace</span><span className="hidden sm:inline">Projected at 7-day pace</span>
          </span>
        )}
        {slowEnd && (
          <span className="hidden items-center gap-2 sm:flex">
            <span className="w-4 border-t-2 border-dotted border-white/30" /> 28-day pace
          </span>
        )}
        {projection && !goalInView && eta && (
          <span className="hidden sm:ml-auto sm:inline">
            500K around <span className="font-mono font-semibold text-foreground">{fmtDate(eta.etaDate)}</span>
          </span>
        )}
      </figcaption>
    </figure>
  );
}
