"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Flame, Search, SlidersHorizontal } from "lucide-react";
import { Avatar } from "@/components/shell/brand";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  total: { label: "Closest to 500K", by: (c: Creator) => c.total },
  pace: { label: "Fastest pace", by: (c: Creator) => c.pace7 },
  streak: { label: "Longest streak", by: (c: Creator) => c.streak },
} as const;
type SortKey = keyof typeof SORTS;

/** Places 1–3: a faint metal shade on the row plus a solid metal rank badge (user-approved podium tints). */
const PODIUM: Record<number, { row: string; badge: string }> = {
  1: { row: "bg-gold/10 hover:bg-gold/15", badge: "bg-gold text-background" },
  2: { row: "bg-silver/10 hover:bg-silver/15", badge: "bg-silver text-background" },
  3: { row: "bg-bronze/10 hover:bg-bronze/15", badge: "bg-bronze text-background" },
};

type Props = {
  creators: Creator[];
  today: string;
  /** Finishers flag button and the "N creators racing" count, placed in the header row. */
  finishers: React.ReactNode;
  count: React.ReactNode;
};

export function LeaderboardTable({ creators, today, finishers, count }: Props) {
  const [sort, setSort] = useState<SortKey>("total");
  const [query, setQuery] = useState("");
  const [sortOpen, setSortOpen] = useState(false);

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
      {/*
        One wrapping row, ordered per screen.
        Phones: [flag] [search + filters] [count] (the title is screen-reader only).
        sm and up: [title ... flag count] / [sort tabs ... search]; the zero-height break splits the rows,
        so the y-gap counts twice (gap-y-3 → 24px between rows).
      */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-x-3 sm:gap-y-3 lg:gap-y-4">
        <h1 className="sr-only sm:not-sr-only sm:order-1 sm:mr-auto text-[1.75rem] leading-tight font-bold tracking-[-0.025em] sm:text-[2.5rem]">
          Race to <span className="text-primary">500K</span>
        </h1>
        <div className="order-1 sm:order-2">{finishers}</div>
        <div className="order-3 sm:order-3">{count}</div>
        <div aria-hidden className="hidden h-0 basis-full sm:order-4 sm:block" />
        {/* sm and up: sort tabs. Phones use the filters button beside search instead. */}
        <div role="tablist" aria-label="Rank by" className="hidden gap-1 rounded-xl border border-hairline bg-surface-lowest p-1 sm:order-5 sm:flex">
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
              {SORTS[k].label}
            </button>
          ))}
        </div>
        <div className="order-2 flex min-w-0 flex-1 gap-2 sm:order-6 sm:ml-auto sm:w-72 sm:flex-none">
        <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-surface-low px-3 focus-within:border-primary">
          <Search className="size-4 text-subtle" />
          <span className="sr-only">Search creators</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search @handle or name"
            className="w-full bg-transparent text-base outline-none placeholder:text-subtle sm:text-sm"
          />
        </label>
        <Popover open={sortOpen} onOpenChange={setSortOpen}>
          <PopoverTrigger
            render={
              <button
                type="button"
                aria-label={`Rank by: ${SORTS[sort].label}`}
                className={cn(
                  "relative inline-flex size-11 shrink-0 items-center justify-center rounded-xl border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:hidden",
                  sortOpen ? "border-primary text-primary" : "border-border bg-surface-low text-foreground",
                )}
              />
            }
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            {/* Lime dot = ranked by something other than the default total. */}
            {sort !== "total" && <span aria-hidden className="absolute top-2 right-2 size-1.5 rounded-full bg-primary" />}
          </PopoverTrigger>
          <PopoverContent align="end" className="w-52 gap-0 p-1">
            <p className="px-3 pt-2 pb-1 font-mono text-[11px] text-subtle">rank by</p>
            {(Object.keys(SORTS) as SortKey[]).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={sort === k}
                onClick={() => {
                  setSort(k);
                  setSortOpen(false);
                }}
                className={cn(
                  "flex h-11 items-center justify-between rounded-lg px-3 text-sm transition-colors hover:bg-hover",
                  sort === k ? "font-semibold text-primary" : "text-foreground",
                )}
              >
                {SORTS[k].label}
                {sort === k && <Check className="size-4" strokeWidth={2.5} aria-hidden />}
              </button>
            ))}
          </PopoverContent>
        </Popover>
        </div>
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
              const podium = PODIUM[c.rank];
              return (
                <li
                  key={c.handle}
                  // `#you` (after login from the landing page's rank check) scrolls here, below the sticky header.
                  id={c.isYou ? "you" : undefined}
                  aria-current={c.isYou ? "true" : undefined}
                  className="scroll-mt-24 border-b border-hairline last:border-b-0"
                >
                  {/* The whole row opens the creator's public progresshub page. */}
                  <Link
                    href={`/u/${c.handle}`}
                    prefetch={false}
                    className={cn(
                      "viz-row grid grid-cols-[24px_minmax(0,1fr)] items-center gap-x-2.5 gap-y-2 px-4 py-3 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary md:grid-cols-[56px_minmax(0,1.3fr)_minmax(0,2fr)_104px_96px_72px] md:gap-x-6 md:px-6",
                      podium ? podium.row : c.isYou ? "bg-primary-soft hover:bg-primary-soft/70" : "hover:bg-hover",
                    )}
                  >
                  <span
                    className={cn(
                      "flex h-6 w-fit min-w-6 items-center justify-center rounded-full px-1 font-mono text-[11px] font-semibold md:h-7 md:min-w-7 md:px-1.5 md:text-xs",
                      podium ? podium.badge : c.isYou ? "bg-primary text-primary-foreground" : "border border-border",
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
                    {/* Phones: the streak as a small bubble in the row's corner (pace and latest gain are md+ only). */}
                    {c.streak > 0 && (
                      <span
                        aria-label={`${c.streak}-day streak`}
                        className="ml-auto inline-flex shrink-0 items-center gap-0.5 rounded-full border border-hairline px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground md:hidden"
                      >
                        <Flame className="size-3" aria-hidden />
                        {c.streak}d
                      </span>
                    )}
                  </span>
                  {/* Impressions, % of 500K and what's left, in one cell */}
                  <span className="col-span-2 flex min-w-0 flex-col gap-1.5 md:col-span-1">
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
                        className={cn("animate-track-fill block h-full rounded-full", c.isYou || c.total >= GOAL ? "bg-primary" : "bg-foreground/70")}
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
