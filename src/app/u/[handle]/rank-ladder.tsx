import { Crown } from "lucide-react";
import { fmtCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

/** At most this many steps; bigger boards show a window around the creator. */
const MAX_STEPS = 7;

type Rank = { rank: number; of: number; toNext: number | null; lead: number | null };

/**
 * The leaderboard as a staircase: one bar per creator, tallest for #1, this creator's bar
 * in lime. Bars grow up one after another on load; #1 gets a crown.
 */
export function RankLadder({ rank, className }: { rank: Rank; className?: string }) {
  const steps = Math.min(rank.of, MAX_STEPS);
  // Window of `steps` places that includes this creator, as close to the top as possible.
  const start = Math.min(Math.max(rank.rank - Math.floor(steps / 2), 1), rank.of - steps + 1);
  const places = Array.from({ length: steps }, (_, i) => start + i);

  return (
    <div
      className={cn("flex h-10 items-end gap-1 sm:h-14 sm:gap-1.5", className)}
      role="img"
      aria-label={`Place ${rank.rank} of ${rank.of} on the leaderboard`}
    >
      {places.map((place, i) => {
        const me = place === rank.rank;
        // #1 is full height; last place keeps a visible stub.
        const height = 100 - ((place - 1) / Math.max(rank.of - 1, 1)) * 72;
        return (
          <span key={place} className="viz-bar relative flex h-full flex-1 items-end">
            {me && place === 1 && (
              <Crown
                className="animate-crown absolute -top-4 left-1/2 size-3.5 -translate-x-1/2 text-primary sm:-top-5 sm:size-4"
                aria-hidden
              />
            )}
            <span
              className={cn("animate-step w-full rounded-t-[3px]", me ? "bg-primary" : "bg-foreground/15")}
              style={{ height: `${height}%`, animationDelay: `${200 + i * 70}ms` }}
            />
          </span>
        );
      })}
    </div>
  );
}

/** "+3.1K to #1" when chasing, "leads by +2K" at the top. */
export function RankGap({ rank }: { rank: Rank }) {
  if (rank.toNext !== null) {
    return (
      <span className="font-mono text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">+{fmtCompact(rank.toNext)}</span> to #{rank.rank - 1}
      </span>
    );
  }
  if (rank.lead !== null) {
    return (
      <span className="font-mono text-xs text-muted-foreground">
        leads by <span className="font-semibold text-primary">+{fmtCompact(rank.lead)}</span>
      </span>
    );
  }
  return null;
}
