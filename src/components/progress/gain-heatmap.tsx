import type { CSSProperties } from "react";
import { Crown, Flame } from "lucide-react";
import { fmt, fmtCompact, fmtDate, fmtSigned } from "@/lib/format";
import { addDays, toUTC, type DayRow } from "@/lib/progress";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Daily gains on a Monday-first calendar. Lime intensity = gain relative to the best day.
 * sm and up, each tile also carries the gain as its main number and a green ▲ / red ▼ against the
 * day before; the best day glows gold with a crown. A Weekly column shows each week as a liquid gauge
 * (fill = week total against the best week) with its change vs the week before. Tiles pop in one after
 * another on load (static with reduced motion). Phones keep the compact grid.
 * Green/red/gold here are user-approved for this card only (see CLAUDE.md).
 */
export function GainHeatmap({ rows, today, weeks = 5 }: { rows: DayRow[]; today: string; weeks?: number }) {
  const byDate = new Map(rows.map((r) => [r.date, r]));
  const dow = (new Date(toUTC(today)).getUTCDay() + 6) % 7; // 0 = Monday
  const start = addDays(today, -dow - (weeks - 1) * 7);
  const days = Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i));
  const gains = rows.map((r) => r.delta ?? 0);
  const max = Math.max(1, ...gains);
  const best = rows.find((r) => r.delta === max)?.date;

  const level = (g: number) => (g <= 0 ? 0 : Math.min(4, Math.ceil((g / max) * 4)));
  const fills = ["", "#c8f43226", "#c8f4324d", "#c8f43299", "#c8f432"];

  // Week totals, for the Week column.
  const weekTotals = Array.from({ length: weeks }, (_, w) =>
    days.slice(w * 7, w * 7 + 7).reduce((sum, d) => sum + Math.max(0, byDate.get(d)?.delta ?? 0), 0),
  );
  const bestWeek = Math.max(1, ...weekTotals);
  const pop = (i: number): CSSProperties => ({ animationDelay: `${i * 22}ms` });

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 min-[360px]:gap-1.5 sm:grid-cols-[repeat(7,minmax(0,1fr))_minmax(0,1.1fr)] sm:gap-2">
        {WEEKDAYS.map((d) => (
          <span key={d} className="pb-1 text-center text-[11px] text-subtle">
            {d}
          </span>
        ))}
        <span className="hidden pb-1 text-center text-[11px] font-semibold text-primary sm:block">Weekly</span>

        {days.flatMap((d, i) => {
          const r = byDate.get(d);
          const future = toUTC(d) > toUTC(today);
          const lv = r?.delta ? level(r.delta) : 0;
          const prev = byDate.get(addDays(d, -1))?.delta;
          const trend = r?.delta != null && prev != null && r.delta !== prev ? (r.delta > prev ? "up" : "down") : null;
          const isBest = d === best && !future;
          const dark = lv >= 3;

          const tile = (
            <div
              key={d}
              title={r ? `${fmtDate(d)}: ${fmtSigned(r.delta ?? 0)} (${fmt(r.total)} total)` : fmtDate(d)}
              className={cn(
                "flex aspect-square flex-col justify-between rounded-md p-1 font-mono text-[10px] max-[359px]:p-0.5 max-[359px]:text-[9px] sm:aspect-[5/3] sm:p-2 sm:text-[11px]",
                !future && "heat-pop",
                future ? "opacity-0" : r && lv ? "" : r ? "border border-border" : "border border-dashed border-hairline",
                dark ? "text-primary-foreground" : "text-muted-foreground",
                d === today && !isBest && "ring-2 ring-foreground ring-offset-2 ring-offset-background",
                // The best day: gold ring + glow, so it's the first thing you see.
                isBest && "relative z-10 ring-2 ring-gold ring-offset-2 ring-offset-background shadow-[0_0_28px_-4px_var(--gold)] sm:scale-[1.03]",
              )}
              style={{ background: r && lv ? fills[lv] : undefined, ...pop(i) }}
            >
              <span className="flex items-start justify-between gap-1">
                <span className={dark ? "" : "text-subtle"}>{Number(d.slice(8))}</span>
                {/* sm+: crown on the best day, else ▲/▼ against the day before. */}
                {isBest ? (
                  <span className="hidden size-5 items-center justify-center rounded-full bg-background sm:inline-flex" aria-label="Best day">
                    <Crown className="size-3 text-gold" strokeWidth={2.5} aria-hidden />
                  </span>
                ) : (
                  trend && (
                    // A black chip keeps green/red readable on dim and bright tiles alike.
                    <span
                      className={cn(
                        "hidden size-4 items-center justify-center rounded-full bg-background text-[8px] leading-none sm:inline-flex",
                        trend === "up" ? "text-trend-up" : "text-trend-down",
                      )}
                      aria-label={trend === "up" ? "up on the day before" : "down on the day before"}
                    >
                      {trend === "up" ? "▲" : "▼"}
                    </span>
                  )
                )}
              </span>
              {r?.delta != null && (
                <span
                  className={cn(
                    "truncate font-semibold tracking-[-0.04em] sm:text-lg sm:leading-none sm:tracking-[-0.03em] lg:text-xl",
                    !dark && lv > 0 && "sm:text-foreground",
                  )}
                >
                  <span className="hidden sm:inline">+</span>
                  {fmtCompact(r.delta)}
                </span>
              )}
              {!r && !future && <span className="hidden text-[10px] text-subtle sm:inline">no log</span>}
            </div>
          );

          if (i % 7 !== 6) return [tile];
          // End of a week (sm and up): a liquid gauge filled by the week's total against the best week,
          // with its change vs the week before.
          const w = Math.floor(i / 7);
          const total = weekTotals[w];
          const prevTotal = w > 0 ? weekTotals[w - 1] : 0;
          const wow = w > 0 && prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : null;
          const weekStarted = toUTC(days[w * 7]) <= toUTC(today);
          const topWeek = total > 0 && total === bestWeek;
          return [
            tile,
            <div
              key={`week-${w}`}
              aria-label={
                weekStarted
                  ? `Week of ${fmtDate(days[w * 7])}: ${fmtSigned(total)}${wow != null ? `, ${wow === 0 ? "same as" : `${wow > 0 ? "up" : "down"} ${Math.abs(wow)}% on`} the week before` : ""}${topWeek ? ", best week" : ""}`
                  : undefined
              }
              className={cn(
                "relative hidden flex-col justify-between overflow-hidden rounded-xl border-2 p-2 font-mono sm:flex",
                topWeek ? "border-primary" : "border-primary/25",
                !weekStarted && "opacity-0",
                weekStarted && "heat-pop",
              )}
              style={pop(i + 1)}
            >
              {/* The liquid: rises to this week's share of the best week. */}
              <span
                aria-hidden
                className={cn("heat-fill absolute inset-x-0 bottom-0", topWeek ? "bg-primary/35" : "bg-primary/20")}
                style={{ height: `${Math.max((total / bestWeek) * 100, total > 0 ? 6 : 0)}%`, ...pop(i + 8) }}
              />
              <span className="relative flex items-center justify-between text-[10px] text-subtle">
                wk {w + 1}
                {topWeek && <Flame className="size-3.5 text-primary" strokeWidth={2.5} aria-hidden />}
              </span>
              <span className={cn("relative text-base leading-none font-semibold tracking-[-0.03em] lg:text-lg", topWeek ? "text-primary" : "text-foreground")}>
                {total > 0 ? `+${fmtCompact(total)}` : "—"}
              </span>
              <span
                aria-hidden
                className={cn(
                  "relative w-fit rounded-full bg-background px-1.5 py-0.5 text-[10px] leading-none font-semibold",
                  wow == null || wow === 0 ? "text-subtle" : wow > 0 ? "text-trend-up" : "text-trend-down",
                )}
              >
                {wow == null ? "first" : wow === 0 ? "= same" : `${wow > 0 ? "▲" : "▼"} ${Math.abs(wow)}%`}
              </span>
            </div>,
          ];
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-1.5 text-[11px] text-subtle">
        {best && (
          <span className="mr-auto text-muted-foreground">
            Best day: <span className="font-mono text-foreground">{fmtDate(best)}</span>, {fmtSigned(max)}
          </span>
        )}
        <span className="mr-3 hidden items-center gap-3 font-mono sm:flex">
          <span className="flex items-center gap-1">
            <Crown className="size-3 text-gold" aria-hidden /> best
          </span>
          <span>
            <span className="text-trend-up">▲</span>/<span className="text-trend-down">▼</span> vs day before
          </span>
        </span>
        <span>Less</span>
        {fills.slice(1).map((f) => (
          <span key={f} className="size-3 rounded-sm" style={{ background: f }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
