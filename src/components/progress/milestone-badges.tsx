import { fmtCompact, fmtDateShort, fmtSigned } from "@/lib/format";
import { MILESTONES, type DayRow } from "@/lib/progress";
import { reachedMilestones } from "@/lib/share-cards";
import { cn } from "@/lib/utils";

/** All 20 milestones (every 25K) as a badge grid: lime = reached, dashed lime = next, dim = ahead. */
export function MilestoneBadges({ rows }: { rows: DayRow[] }) {
  const passed = reachedMilestones(rows);
  const reachedOn = new Map(passed.map((m) => [m.target, m.date]));
  const next = MILESTONES.find((m) => !reachedOn.has(m));
  const latest = passed.at(-1);
  const best = rows.reduce<DayRow | null>((b, r) => (r.delta != null && (!b || r.delta > (b.delta ?? 0)) ? r : b), null);

  return (
    <section aria-labelledby="milestones-title" className="panel-dark flex flex-col rounded-2xl p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="milestones-title" className="text-xl font-bold tracking-[-0.015em]">
          Milestones
        </h2>
        <p className="font-mono text-[1.75rem] leading-none font-semibold tracking-[-0.04em]">
          <span className="text-primary">{passed.length}</span>
          <span className="text-base text-subtle">/{MILESTONES.length}</span>
        </p>
      </div>

      <ol className="mt-5 mb-5 grid min-h-48 flex-1 auto-rows-fr grid-cols-5 gap-1.5">
        {MILESTONES.map((m) => {
          const date = reachedOn.get(m);
          const isNext = m === next;
          return (
            <li
              key={m}
              title={date ? `${fmtCompact(m)} reached ${fmtDateShort(date)}` : isNext ? `Next: ${fmtCompact(m)}` : fmtCompact(m)}
              className={cn(
                "flex items-center justify-center rounded-md font-mono text-[11px] font-semibold",
                date
                  ? "bg-primary text-primary-foreground"
                  : isNext
                    ? "border border-dashed border-primary text-primary"
                    : "border border-hairline text-subtle",
              )}
            >
              {fmtCompact(m)}
              <span className="sr-only">{date ? `, reached ${fmtDateShort(date)}` : isNext ? ", next" : ", not yet"}</span>
            </li>
          );
        })}
      </ol>

      <dl className="grid grid-cols-2 gap-3 border-t border-hairline pt-4 font-mono text-xs">
        <div>
          <dt className="text-subtle">latest</dt>
          <dd className="mt-0.5 text-foreground">{latest ? `${fmtCompact(latest.target)} · ${fmtDateShort(latest.date)}` : "—"}</dd>
        </div>
        <div>
          <dt className="text-subtle">best day</dt>
          <dd className="mt-0.5 text-foreground">{best?.delta != null ? `${fmtSigned(best.delta)} · ${fmtDateShort(best.date)}` : "—"}</dd>
        </div>
      </dl>
    </section>
  );
}
