"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Moon } from "lucide-react";
import { Avatar } from "@/components/shell/brand";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { fmt, fmtAgo } from "@/lib/format";
import { ACTIVE_DAYS } from "@/lib/progress";
import { cn } from "@/lib/utils";

export type InactiveCreator = {
  name: string;
  handle: string;
  total: number;
  avatarUrl: string | null;
  isYou: boolean;
  lastLoggedOn: string;
};

/**
 * Creators with no log in more than ACTIVE_DAYS days leave the race table so it stays about people
 * logging now. This corner button lists them (highest total first); they rejoin when they log again.
 * Opens on its own at /leaderboard?inactive=1.
 */
export function InactiveDialog({ creators, today }: { creators: InactiveCreator[]; today: string }) {
  const params = useSearchParams();
  const youInactive = creators.some((c) => c.isYou);

  return (
    <Dialog defaultOpen={params.get("inactive") === "1"}>
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label={`${creators.length} ${creators.length === 1 ? "creator is" : "creators are"} inactive (no log in ${ACTIVE_DAYS}+ days). Show inactive`}
            className={cn(
              "inline-flex size-11 items-center justify-center gap-1.5 rounded-xl border font-mono text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:h-9 sm:w-auto sm:rounded-full sm:px-3",
              youInactive ? "border-primary text-primary hover:bg-primary-soft" : "border-border text-muted-foreground hover:bg-hover hover:text-foreground",
            )}
          />
        }
      >
        <Moon className="size-4 sm:size-3.5" strokeWidth={2.5} aria-hidden />
        {/* Phones: the moon alone. sm and up: moon, count and "inactive". */}
        <span className="hidden sm:inline">{fmt(creators.length)}</span>
        <span className="hidden font-sans font-medium sm:inline">inactive</span>
      </DialogTrigger>

      <DialogContent className="panel-dark gap-0 rounded-2xl p-0 ring-0 sm:max-w-[440px] [&>[data-slot=dialog-close]]:top-4 [&>[data-slot=dialog-close]]:right-4">
        <div className="flex items-center justify-between gap-4 border-b border-hairline px-5 py-4 pr-14 sm:px-6">
          <div>
            <DialogTitle className="text-lg font-bold tracking-[-0.015em] text-foreground">Inactive</DialogTitle>
            <DialogDescription className="font-mono text-xs text-subtle">no log in {ACTIVE_DAYS}d+</DialogDescription>
          </div>
          <span className="font-mono text-[2rem] leading-none font-semibold tracking-[-0.04em] text-foreground tabular-nums">
            {fmt(creators.length)}
          </span>
        </div>

        {creators.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12">
            <Moon className="size-6 text-subtle" aria-hidden />
            <p className="font-mono text-xs text-subtle">everyone is logging</p>
          </div>
        ) : (
          <ul className="max-h-[60dvh] divide-y divide-hairline overflow-y-auto">
            {creators.map((c) => (
              <li key={c.handle}>
                <Link
                  href={c.isYou ? "/progress" : `/u/${c.handle}`}
                  prefetch={false}
                  aria-label={`${c.name} (@${c.handle}), ${fmt(c.total)} impressions, last log ${fmtAgo(c.lastLoggedOn, today)}${c.isYou ? ". Log today to rejoin the race" : ""}`}
                  className={cn(
                    "flex items-center gap-3 px-5 py-3 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary sm:px-6",
                    c.isYou ? "bg-primary-soft hover:bg-primary-soft/70" : "hover:bg-hover",
                  )}
                >
                  <Avatar name={c.name} src={c.avatarUrl} className="size-9 shrink-0 border border-border bg-background text-foreground opacity-70" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 truncate text-sm font-semibold">
                      {c.name}
                      {c.isYou && <span className="rounded-full bg-foreground px-1.5 py-px text-[11px] font-semibold text-background">You</span>}
                    </span>
                    <span className="block truncate font-mono text-xs text-muted-foreground">@{c.handle}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end">
                    <span className="font-mono text-sm font-semibold text-muted-foreground">{fmt(c.total)}</span>
                    <span className="font-mono text-[11px] text-subtle">{fmtAgo(c.lastLoggedOn, today)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
