import Link from "next/link";
import { Flag } from "lucide-react";
import { fmtCompact } from "@/lib/format";
import { GOAL } from "@/lib/progress";

/**
 * The closing invite as a race: the creator's lime dot runs out to where they are on the
 * road to 500K, and a white "you" dot pulses at the start line next to the CTA.
 */
export function RaceInvite({ handle, total, finished = false }: { handle: string; total: number; finished?: boolean }) {
  const pct = Math.min((total / GOAL) * 100, 100);
  return (
    <section className="panel-dark flex flex-col gap-5 rounded-2xl border-primary/40 p-5 sm:p-6 lg:col-span-3">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-lg font-bold tracking-[-0.015em]">
            {finished ? (
              <>
                <span className="text-primary">@{handle}</span> finished the race
              </>
            ) : (
              <>
                Race <span className="text-primary">@{handle}</span> to 500K
              </>
            )}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">Log your X impressions daily. Free.</p>
        </div>
        <Link
          href="/login"
          className="inline-flex h-11 shrink-0 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover active:bg-primary-pressed"
        >
          Track your own
        </Link>
      </div>

      {/* Two lanes: the creator, already out on the road, and you at the start */}
      <div
        className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 font-mono text-[11px]"
        role="img"
        aria-label={finished ? `@${handle} reached 500K. You start at 0.` : `@${handle} is at ${fmtCompact(total)} of 500K. You start at 0.`}
      >
        <span className="truncate text-primary">@{handle}</span>
        <Lane>
          <span
            className="animate-race-run absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary"
            style={{ left: `max(6px, ${pct}%)` }}
          />
        </Lane>
        <span className="flex items-center justify-end gap-1 text-right text-primary">
          {finished && <Flag className="size-3" aria-hidden />}
          <span className={finished ? undefined : "text-foreground"}>{fmtCompact(total)}</span>
        </span>

        <span className="text-muted-foreground">you</span>
        <Lane>
          <span className="animate-you-pulse absolute top-1/2 left-0 size-3 -translate-y-1/2 rounded-full border-2 border-foreground bg-background" />
        </Lane>
        <span className="flex items-center justify-end gap-1 text-subtle">
          <Flag className="size-3" aria-hidden />
          500K
        </span>
      </div>
    </section>
  );
}

function Lane({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-3">
      <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-hairline" />
      {children}
    </div>
  );
}
