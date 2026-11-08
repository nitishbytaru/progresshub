import { fmt, fmtCompact, fmtDate, fmtSigned } from "@/lib/format";
import { addDays, toUTC, type DayRow } from "@/lib/progress";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Daily gains on a Monday-first calendar. Lime intensity = gain relative to the best day. */
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

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {WEEKDAYS.map((d) => (
          <span key={d} className="pb-1 text-center text-[11px] text-subtle">
            {d}
          </span>
        ))}
        {days.map((d) => {
          const r = byDate.get(d);
          const future = toUTC(d) > toUTC(today);
          const lv = r?.delta ? level(r.delta) : 0;
          return (
            <div
              key={d}
              title={r ? `${fmtDate(d)}: ${fmtSigned(r.delta ?? 0)} (${fmt(r.total)} total)` : fmtDate(d)}
              className={cn(
                "flex aspect-square flex-col justify-between rounded-md p-1 font-mono text-[10px] sm:aspect-[5/3] sm:p-1.5 lg:aspect-[5/2] sm:text-[11px]",
                future ? "opacity-0" : r && lv ? "" : r ? "border border-border" : "border border-dashed border-hairline",
                lv >= 3 ? "text-primary-foreground" : "text-muted-foreground",
                d === today && "ring-2 ring-foreground ring-offset-2 ring-offset-background",
              )}
              style={{ background: r && lv ? fills[lv] : undefined }}
            >
              <span className={lv >= 3 ? "" : "text-subtle"}>{Number(d.slice(8))}</span>
              {r?.delta != null && (
                <span className="hidden font-semibold sm:block">
                  +{fmtCompact(r.delta)}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-1.5 text-[11px] text-subtle">
        {best && (
          <span className="mr-auto text-muted-foreground">
            Best day: <span className="font-mono text-foreground">{fmtDate(best)}</span>, {fmtSigned(max)}
          </span>
        )}
        <span>Less</span>
        {fills.slice(1).map((f) => (
          <span key={f} className="size-3 rounded-sm" style={{ background: f }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
