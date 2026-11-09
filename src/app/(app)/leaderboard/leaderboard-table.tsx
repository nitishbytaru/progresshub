"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Avatar } from "@/components/shell/brand";
import { fmt, fmtCompact, fmtPct, fmtSigned } from "@/lib/format";
import { daysBetween, GOAL } from "@/lib/progress";
import { cn } from "@/lib/utils";

export type Creator = {
  name: string;
  handle: string;
  total: number;
  pace7: number;
  streak: number;
  avatarUrl: string | null;
  isYou: boolean;
  /** Most recent gain (latest log minus the one before) and when that latest log was. */
  lastGain: number | null;
  lastLoggedOn: string;
};

/** "today", "yesterday" or "5d ago" for a log date, relative to the viewer's today. */
function ago(date: string, today: string) {
  const d = daysBetween(date, today);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d}d ago`;
}

const SORTS = {
  total: { label: "Closest to 500K", short: "Total", by: (c: Creator) => c.total },
  pace: { label: "Fastest pace", short: "Pace", by: (c: Creator) => c.pace7 },
  streak: { label: "Longest streak", short: "Streak", by: (c: Creator) => c.streak },
} as const;
type SortKey = keyof typeof SORTS;

export function LeaderboardTable({ creators, today }: { creators: Creator[]; today: string }) {
  const [sort, setSort] = useState<SortKey>("total");
  const [query, setQuery] = useState("");

  const ranked = useMemo(
    () =>
      [...creators]
        .sort((a, b) => SORTS[sort].by(b) - SORTS[sort].by(a))
        .map((c, i) => ({ ...c, rank: i + 1 })),
    [creators, sort],
  );
  const q = query.trim().toLowerCase().replace(/^@/, "");
  const shown = q ? ranked.filter((c) => c.handle.includes(q) || c.name.toLowerCase().includes(q)) : ranked;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label="Rank by" className="grid grid-cols-3 gap-1 rounded-xl border border-hairline bg-surface-lowest p-1 sm:flex">
          {(Object.keys(SORTS) as SortKey[]).map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={sort === k}
              onClick={() => setSort(k)}
              className={cn(
                "min-h-9 rounded-lg px-2 py-1.5 text-[13px] leading-tight font-medium transition-colors sm:px-3.5 sm:text-sm sm:whitespace-nowrap",
                sort === k ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="sm:hidden">{SORTS[k].short}</span>
              <span className="hidden sm:inline">{SORTS[k].label}</span>
            </button>
          ))}
        </div>
        <label className="flex h-11 items-center gap-2 rounded-xl border border-border bg-surface-low px-3 focus-within:border-primary sm:w-72">
          <Search className="size-4 text-subtle" />
          <span className="sr-only">Search creators</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search @handle or name"
            className="w-full bg-transparent text-sm outline-none placeholder:text-subtle"
          />
        </label>
      </div>

      <div className="panel-dark overflow-hidden rounded-2xl">
        {ranked.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="font-semibold">No one is on the board yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">Log your first day and you&apos;ll be the first creator here.</p>
          </div>
        ) : shown.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="font-semibold">No creators match “{query}”.</p>
            <button onClick={() => setQuery("")} className="mt-2 text-sm font-medium text-muted-foreground underline hover:text-foreground">
              Clear search
            </button>
          </div>
        ) : (
          <ol>
            <li aria-hidden className="hidden grid-cols-[56px_minmax(0,1.3fr)_minmax(0,2fr)_104px_96px_72px] gap-6 border-b border-hairline px-6 py-3 text-xs text-muted-foreground md:grid">
              <span>Rank</span>
              <span>Creator</span>
              <span>Progress to 500K</span>
              <span className="text-right">Latest gain</span>
              <span className="text-right">7-day pace</span>
              <span className="text-right">Streak</span>
            </li>
            {shown.map((c) => {
              const pct = (c.total / GOAL) * 100;
              return (
                <li
                  key={c.handle}
                  aria-current={c.isYou ? "true" : undefined}
                  className="border-b border-hairline last:border-b-0"
                >
                  {/* The whole row opens the creator's public progresshub page. */}
                  <Link
                    href={`/u/${c.handle}`}
                    prefetch={false}
                    className={cn(
                      "grid grid-cols-[40px_minmax(0,1fr)] items-center gap-x-3 gap-y-2 px-4 py-3 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary md:grid-cols-[56px_minmax(0,1.3fr)_minmax(0,2fr)_104px_96px_72px] md:gap-x-6 md:px-6",
                      c.isYou ? "bg-primary-soft hover:bg-primary-soft/70" : "hover:bg-hover",
                    )}
                  >
                  <span
                    className={cn(
                      "flex h-7 w-fit min-w-7 items-center justify-center rounded-full px-1.5 font-mono text-xs font-semibold",
                      c.isYou ? "bg-primary text-primary-foreground" : c.rank <= 3 ? "bg-foreground text-background" : "border border-border",
                    )}
                  >
                    {c.rank}
                  </span>
                  <span className="flex min-w-0 items-center gap-3">
                    <Avatar name={c.name} src={c.avatarUrl} className="hidden border border-border bg-background text-foreground sm:inline-flex" />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 truncate text-sm font-semibold">
                        {c.name}
                        {c.isYou && (
                          <span className="rounded-full bg-foreground px-1.5 py-px text-[10px] font-semibold text-background">You</span>
                        )}
                      </span>
                      <span className="hidden truncate font-mono text-xs text-muted-foreground sm:block">@{c.handle}</span>
                    </span>
                  </span>
                  {/* Impressions, % of 500K and what's left, in one cell */}
                  <span className="col-start-2 flex min-w-0 flex-col gap-1.5 md:col-start-auto">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="font-mono text-sm font-semibold md:text-base">{fmt(c.total)}</span>
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">
                        <span className={cn(c.isYou && "text-primary")}>{fmtPct(pct)}</span>
                        <span className="hidden text-subtle sm:inline"> · {c.total >= GOAL ? "done" : `${fmtCompact(GOAL - c.total)} left`}</span>
                      </span>
                    </span>
                    <span
                      className="h-1.5 overflow-hidden rounded-full bg-surface-highest"
                      role="img"
                      aria-label={`${fmt(c.total)} of 500,000, ${c.total >= GOAL ? "goal reached" : `${fmt(GOAL - c.total)} to go`}`}
                    >
                      <span
                        className={cn("block h-full rounded-full", c.isYou || c.total >= GOAL ? "bg-primary" : "bg-foreground/70")}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </span>
                  </span>
                  <span className="hidden flex-col items-end md:flex">
                    <span className={cn("font-mono text-sm font-semibold", c.lastGain && c.lastGain > 0 && "text-primary")}>
                      {c.lastGain == null ? "—" : fmtSigned(c.lastGain)}
                    </span>
                    <span className="font-mono text-[11px] text-subtle">{c.lastGain == null ? "first log" : ago(c.lastLoggedOn, today)}</span>
                  </span>
                  <span className={cn("hidden text-right font-mono text-sm md:block", sort === "pace" && "font-semibold")}>
                    {fmtSigned(c.pace7)}
                  </span>
                  <span className={cn("hidden text-right font-mono text-sm md:block", sort === "streak" && "font-semibold")}>
                    {c.streak}d
                  </span>
                  <span className="col-start-2 flex gap-4 font-mono text-[11px] text-muted-foreground md:hidden">
                    {c.lastGain != null && (
                      <span className="text-foreground">
                        {fmtSigned(c.lastGain)} {ago(c.lastLoggedOn, today)}
                      </span>
                    )}
                    <span>{fmtSigned(c.pace7)}/day</span>
                    <span>{c.streak}d</span>
                  </span>
                  <span className="sr-only">(view @{c.handle}&apos;s profile)</span>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
