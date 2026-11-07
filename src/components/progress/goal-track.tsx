import { Check, Flag } from "lucide-react";
import { fmtCompact, fmtDateShort } from "@/lib/format";
import { GOAL, type MilestoneStatus } from "@/lib/progress";
import { cn } from "@/lib/utils";

/** The 500K runway: lime fill to today, milestone pins with reached or estimated dates. */
export function GoalTrack({ total, milestones }: { total: number; milestones: MilestoneStatus[] }) {
  const pct = Math.min((total / GOAL) * 100, 100);
  return (
    <div className="pt-10 pb-12">
      <div className="relative">
        <div
          className="absolute -top-9 z-10 flex -translate-x-1/2 flex-col items-center"
          style={{ left: `clamp(2.5rem, ${pct}%, calc(100% - 2.5rem))` }}
        >
          <span className="whitespace-nowrap rounded-md bg-primary px-2 py-0.5 font-mono text-[11px] font-semibold text-primary-foreground">
            {fmtCompact(total)} now
          </span>
          <span className="h-3 w-px bg-primary" />
        </div>

        <div className="h-3 overflow-hidden rounded-full border border-hairline bg-surface-high p-px">
          <div className="animate-track-fill h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </div>

        <div className="absolute top-full left-0 mt-3 font-mono text-[11px] text-subtle">0</div>
        {milestones.map((m) => {
          const left = (m.target / GOAL) * 100;
          const reached = Boolean(m.reachedOn);
          const isGoal = m.target === GOAL;
          return (
            <div
              key={m.target}
              className={cn(
                "absolute top-full mt-3 flex flex-col font-mono text-[11px]",
                isGoal ? "right-0 items-end" : "-translate-x-1/2 items-center",
              )}
              style={isGoal ? undefined : { left: `${left}%` }}
            >
              <span
                className={cn(
                  "flex items-center gap-1 font-semibold",
                  reached ? "text-primary" : "text-foreground",
                )}
              >
                {reached ? <Check className="size-3" strokeWidth={3} /> : <Flag className="size-3" />}
                {fmtCompact(m.target)}
              </span>
              <span className="text-subtle">
                {reached
                  ? fmtDateShort(m.reachedOn!)
                  : m.estimatedOn
                    ? `est. ${fmtDateShort(m.estimatedOn)}`
                    : "no estimate yet"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
