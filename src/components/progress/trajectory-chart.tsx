import { fmtCompact, fmtDateShort, fmt } from "@/lib/format";
import { GOAL, MILESTONES, daysBetween, type DayRow, type Forecast } from "@/lib/progress";

const W = 1000;
const H = 300;
const Y_MAX = GOAL * 1.06;

type Props = {
  rows: DayRow[];
  eta: Forecast;
  /** Optional slower projection, drawn fainter. */
  etaSlow?: Forecast;
  height?: string;
};

/**
 * Logged impressions (lime) and the projection to 500K at the current pace (white, dashed).
 * Drawn in a stretched SVG with non-scaling strokes; labels are HTML so text never distorts.
 */
export function TrajectoryChart({ rows, eta, etaSlow, height = "h-64 sm:h-80" }: Props) {
  const first = rows[0];
  const last = rows[rows.length - 1];
  const end = [eta?.etaDate, etaSlow?.etaDate, last.date]
    .filter(Boolean)
    .sort()
    .at(-1)!;
  const span = Math.max(1, daysBetween(first.date, end));

  const x = (date: string) => (daysBetween(first.date, date) / span) * W;
  const y = (v: number) => H - (Math.min(v, Y_MAX) / Y_MAX) * H;
  const pctX = (date: string) => (x(date) / W) * 100;
  const pctY = (v: number) => (y(v) / H) * 100;

  const line = rows.map((r) => `${x(r.date).toFixed(1)},${y(r.total).toFixed(1)}`).join(" ");
  const area = `M ${x(first.date)},${H} L ${line.replaceAll(" ", " L ")} L ${x(last.date)},${H} Z`;

  const ticks = [first.date, last.date, eta?.etaDate].filter(Boolean) as string[];

  return (
    <figure className="m-0">
      <div className="relative">
        <div className={`relative ${height}`}>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="absolute inset-0 size-full overflow-visible"
            role="img"
            aria-label={`Impressions grew from ${fmt(first.total)} to ${fmt(last.total)}${
              eta ? `; at the current pace 500,000 is reached around ${fmtDateShort(eta.etaDate)}` : ""
            }.`}
          >
            <defs>
              <linearGradient id="traj-area" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#c8f432" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#c8f432" stopOpacity="0" />
              </linearGradient>
            </defs>

            {MILESTONES.map((m) => (
              <line
                key={m}
                x1="0"
                x2={W}
                y1={y(m)}
                y2={y(m)}
                stroke={m === GOAL ? "#ffffff3d" : "#ffffff14"}
                strokeDasharray={m === GOAL ? "6 6" : undefined}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <line x1="0" x2={W} y1={H} y2={H} stroke="#ffffff1f" vectorEffect="non-scaling-stroke" />

            {etaSlow && etaSlow.etaDate !== eta?.etaDate && (
              <line
                x1={x(last.date)}
                y1={y(last.total)}
                x2={x(etaSlow.etaDate)}
                y2={y(GOAL)}
                stroke="#ffffff40"
                strokeWidth="1.5"
                strokeDasharray="3 6"
                vectorEffect="non-scaling-stroke"
              />
            )}
            {eta && (
              <line
                x1={x(last.date)}
                y1={y(last.total)}
                x2={x(eta.etaDate)}
                y2={y(GOAL)}
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

          {/* Y labels */}
          {MILESTONES.map((m) => (
            <span
              key={m}
              className="absolute right-0 -translate-y-[calc(100%+4px)] font-mono text-[11px] text-subtle"
              style={{ top: `${pctY(m)}%` }}
            >
              {fmtCompact(m)}
            </span>
          ))}

          {/* Today point */}
          <span
            className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-[2.5px] border-primary bg-background"
            style={{ left: `${pctX(last.date)}%`, top: `${pctY(last.total)}%` }}
          />
          <div
            className="absolute -translate-x-1/2 -translate-y-[calc(100%+14px)] rounded-lg border border-border bg-surface-high px-2.5 py-1.5 font-mono text-[11px] whitespace-nowrap shadow-[0_8px_24px_#0b0b0c80]"
            style={{ left: `clamp(4.5rem, ${pctX(last.date)}%, calc(100% - 4.5rem))`, top: `${pctY(last.total)}%` }}
          >
            <span className="block text-subtle">{fmtDateShort(last.date)} · latest log</span>
            <span className="font-semibold text-primary">{fmt(last.total)}</span>
          </div>

          {/* Goal point */}
          {eta && (
            <span
              className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-[2.5px] border-foreground bg-background"
              style={{ left: `${pctX(eta.etaDate)}%`, top: `${pctY(GOAL)}%` }}
            />
          )}
        </div>

        {/* X labels */}
        <div className="relative mt-3 h-4 font-mono text-[11px]">
          {ticks.map((t, i) => (
            <span
              key={t + i}
              className={
                i === 0
                  ? "absolute left-0 text-subtle"
                  : i === ticks.length - 1 && t === eta?.etaDate
                    ? "absolute right-0 font-semibold text-foreground"
                    : "absolute -translate-x-1/2 font-semibold text-primary"
              }
              style={i === 0 || (i === ticks.length - 1 && t === eta?.etaDate) ? undefined : { left: `${pctX(t)}%` }}
            >
              {i === 1 ? "Today" : fmtDateShort(t)}
              {t === eta?.etaDate && " · 500K"}
            </span>
          ))}
        </div>
      </div>

      <figcaption className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-4 rounded bg-primary" /> Logged impressions
        </span>
        {eta && (
          <span className="flex items-center gap-2">
            <span className="w-4 border-t-2 border-dashed border-white/60" /> Projected at 7-day pace
          </span>
        )}
        {etaSlow && etaSlow.etaDate !== eta?.etaDate && (
          <span className="flex items-center gap-2">
            <span className="w-4 border-t-2 border-dotted border-white/30" /> Projected at 28-day pace
          </span>
        )}
      </figcaption>
    </figure>
  );
}
