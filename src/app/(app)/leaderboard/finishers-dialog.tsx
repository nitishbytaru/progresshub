"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Flag } from "lucide-react";
import { Avatar } from "@/components/shell/brand";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { fmt, fmtDateShort } from "@/lib/format";
import { cn } from "@/lib/utils";

export type Finisher = {
  name: string;
  handle: string;
  total: number;
  avatarUrl: string | null;
  isYou: boolean;
  /** First day their log reached 500K. */
  finishedOn: string | null;
};

/**
 * Creators at 500K have finished the race, so they leave the table. This small corner button
 * opens the list of everyone who crossed the line, in the order they finished.
 * Opens on its own at /leaderboard?finishers=1 (linked from a finisher's public page).
 */
export function FinishersDialog({ finishers }: { finishers: Finisher[] }) {
  const params = useSearchParams();
  const youFinished = finishers.some((f) => f.isYou);

  return (
    <Dialog defaultOpen={params.get("finishers") === "1"}>
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label={`${finishers.length} ${finishers.length === 1 ? "creator has" : "creators have"} reached 500K. Show finishers`}
            className={cn(
              "inline-flex size-11 items-center justify-center gap-1.5 rounded-xl border font-mono sm:h-9 sm:w-auto sm:rounded-full sm:px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              youFinished ? "border-primary bg-primary text-primary-foreground hover:bg-primary-hover" : "border-primary/40 text-primary hover:bg-primary-soft",
            )}
          />
        }
      >
        <Flag className="size-4 sm:size-3.5" strokeWidth={2.5} aria-hidden />
        {/* Phones: the flag alone. sm and up: flag, count and "finished". */}
        <span className="hidden sm:inline">{fmt(finishers.length)}</span>
        <span className="hidden font-sans font-medium sm:inline">finished</span>
      </DialogTrigger>

      <DialogContent className="panel-dark gap-0 rounded-2xl p-0 ring-0 sm:max-w-[440px] [&>[data-slot=dialog-close]]:top-4 [&>[data-slot=dialog-close]]:right-4">
        <div className="flex items-center justify-between gap-4 border-b border-hairline px-5 py-4 pr-14 sm:px-6">
          <div>
            <DialogTitle className="text-lg font-bold tracking-[-0.015em] text-foreground">Finishers</DialogTitle>
            <DialogDescription className="font-mono text-xs text-subtle">reached 500K</DialogDescription>
          </div>
          <span className="font-mono text-[2rem] leading-none font-semibold tracking-[-0.04em] text-primary tabular-nums">
            {fmt(finishers.length)}
          </span>
        </div>

        {finishers.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12">
            <Flag className="size-6 text-subtle" aria-hidden />
            <p className="font-mono text-xs text-subtle">no one yet</p>
          </div>
        ) : (
          <ol className="max-h-[60dvh] divide-y divide-hairline overflow-y-auto">
            {finishers.map((f, i) => (
              <li key={f.handle}>
                <Link
                  href={`/u/${f.handle}`}
                  prefetch={false}
                  aria-label={`${i + 1}. ${f.name} (@${f.handle}) reached 500K${f.finishedOn ? ` on ${fmtDateShort(f.finishedOn)}` : ""}, ${fmt(f.total)} impressions`}
                  className={cn(
                    "flex items-center gap-3 px-5 py-3 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary sm:px-6",
                    f.isYou ? "bg-primary-soft hover:bg-primary-soft/70" : "hover:bg-hover",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold",
                      i === 0 ? "bg-primary text-primary-foreground" : "border border-border text-foreground",
                    )}
                  >
                    {i + 1}
                  </span>
                  <Avatar name={f.name} src={f.avatarUrl} className="size-9 shrink-0 border border-border bg-background text-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 truncate text-sm font-semibold">
                      {f.name}
                      {f.isYou && <span className="rounded-full bg-foreground px-1.5 py-px text-[10px] font-semibold text-background">You</span>}
                    </span>
                    <span className="block truncate font-mono text-xs text-muted-foreground">@{f.handle}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end">
                    <span className="font-mono text-sm font-semibold text-primary">{fmt(f.total)}</span>
                    {f.finishedOn && <span className="font-mono text-[11px] text-subtle">{fmtDateShort(f.finishedOn)}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}
