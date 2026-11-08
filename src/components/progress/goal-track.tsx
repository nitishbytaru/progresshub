import { Check, Flag } from "lucide-react";
import { fmtCompact, fmtDateShort } from "@/lib/format";
import { GOAL, type MilestoneStatus } from "@/lib/progress";
import { cn } from "@/lib/utils";

/**
 * The 500K runway: lime fill to today, a notch at every 25K milestone (darker once passed),
 * and labelled pins only for the next milestone and 500K so the labels never collide.
 */
export function GoalTrack({ total, milestones }: { total: number; milestones: MilestoneStatus[] }) {
  const pct = Math.min((total / GOAL) * 100, 100);
  const reachedCount = milestones.filter((m) => m.reachedOn).length;
  const next = milestones.find((m) => !m.reachedOn && m.target < GOAL);
  // Pins closer than 50K to the 500K pin would overlap it, so skip them.
  const pins = milestones.filter((m) => m.target === GOAL || (m === next && m.target <= GOAL - 50_000));
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

        <div
          className="relative h-3 overflow-hidden rounded-full border border-hairline bg-surface-high p-px"
          role="img"
          aria-label={`${reachedCount} of ${milestones.length} milestones reached`}
        >
          <div className="animate-track-fill h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
          {milestones
            .filter((m) => m.target < GOAL)
            .map((m) => (
              <span
                key={m.target}
                aria-hidden
                className={cn("absolute inset-y-0 w-px", m.reachedOn ? "bg-background/45" : "bg-foreground/15")}
                style={{ left: `${(m.target / GOAL) * 100}%` }}
              />
            ))}
        </div>

        <div className="absolute top-full left-0 mt-3 flex flex-col font-mono text-[11px]">
          <span className={cn("flex items-center gap-1 font-semibold", reachedCount ? "text-primary" : "text-subtle")}>
            <Check className="size-3" strokeWidth={3} aria-hidden />
            {reachedCount}/{milestones.length}
          </span>
          <span className="text-subtle">milestones</span>
        </div>
        {pins.map((m) => {
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
              // Kept clear of the milestone count on the left.
              style={isGoal ? undefined : { left: `max(8.5rem, ${left}%)` }}
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
