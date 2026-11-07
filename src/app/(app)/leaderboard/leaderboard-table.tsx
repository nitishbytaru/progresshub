"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Initials } from "@/components/shell/brand";
import { fmt, fmtPct, fmtSigned } from "@/lib/format";
import { GOAL } from "@/lib/progress";
import type { Creator } from "@/lib/sample-data";
import { cn } from "@/lib/utils";

const SORTS = {
  total: { label: "Closest to 500K", phrase: "total impressions", by: (c: Creator) => c.total },
  pace: { label: "Fastest pace", phrase: "7-day pace", by: (c: Creator) => c.pace7 },
  streak: { label: "Longest streak", phrase: "logging streak", by: (c: Creator) => c.streak },
} as const;
type SortKey = keyof typeof SORTS;

export function LeaderboardTable({ creators }: { creators: Creator[] }) {
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
  const you = ranked.find((c) => c.isYou);

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
              {SORTS[k].label}
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

      {you && (
        <p className="text-sm text-muted-foreground">
          You&apos;re <span className="font-mono font-semibold text-primary">#{you.rank}</span> of{" "}
          {ranked.length} by {SORTS[sort].phrase}.
        </p>
      )}

      <div className="panel-paper overflow-hidden rounded-2xl">
        {shown.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="font-semibold">No creators match “{query}”.</p>
            <button onClick={() => setQuery("")} className="mt-2 text-sm font-medium text-paper-muted underline hover:text-paper-foreground">
              Clear search
            </button>
          </div>
        ) : (
          <ol>
            <li aria-hidden className="hidden grid-cols-[56px_minmax(0,1.6fr)_120px_minmax(0,1.4fr)_96px_96px_72px] gap-4 border-b border-paper-border px-6 py-3 text-xs text-paper-muted md:grid">
              <span>Rank</span>
              <span>Creator</span>
              <span className="text-right">Impressions</span>
              <span>Progress</span>
              <span className="text-right">To go</span>
              <span className="text-right">7-day pace</span>
              <span className="text-right">Streak</span>
            </li>
            {shown.map((c) => {
              const pct = (c.total / GOAL) * 100;
              return (
                <li
                  key={c.handle}
                  aria-current={c.isYou ? "true" : undefined}
                  className={cn(
                    "grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-b border-paper-border px-4 py-3.5 last:border-b-0 md:grid-cols-[56px_minmax(0,1.6fr)_120px_minmax(0,1.4fr)_96px_96px_72px] md:gap-4 md:px-6",
                    c.isYou ? "bg-primary-soft" : "hover:bg-paper-dim",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-fit min-w-7 items-center justify-center rounded-full px-1.5 font-mono text-xs font-semibold",
                      c.isYou ? "bg-primary text-primary-foreground" : c.rank <= 3 ? "bg-paper-foreground text-paper" : "bg-paper-dim",
                    )}
                  >
                    {c.rank}
                  </span>
                  <span className="flex min-w-0 items-center gap-3">
                    <Initials name={c.name} className="hidden bg-paper-dim sm:inline-flex" />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 truncate text-sm font-semibold">
                        {c.name}
                        {c.isYou && (
                          <span className="rounded-full bg-paper-foreground px-1.5 py-px text-[10px] font-semibold text-paper">You</span>
                        )}
                      </span>
                      <span className="block truncate font-mono text-xs text-paper-muted">@{c.handle}</span>
                    </span>
                  </span>
                  <span className="text-right font-mono text-sm font-semibold md:text-base">{fmt(c.total)}</span>

                  <span className="col-span-2 col-start-2 flex items-center gap-2 md:col-span-1 md:col-start-auto">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-dim">
                      <span
                        className={cn("block h-full rounded-full", c.isYou ? "bg-paper-foreground" : "bg-paper-foreground/70")}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </span>
                    <span className="w-12 text-right font-mono text-xs">{fmtPct(pct)}</span>
                  </span>
                  <span className="hidden text-right font-mono text-sm text-paper-muted md:block">{fmt(Math.max(0, GOAL - c.total))}</span>
                  <span className={cn("hidden text-right font-mono text-sm md:block", sort === "pace" && "font-semibold")}>
                    {fmtSigned(c.pace7)}
                  </span>
                  <span className={cn("hidden text-right font-mono text-sm md:block", sort === "streak" && "font-semibold")}>
                    {c.streak}d
                  </span>
                  <span className="col-span-2 col-start-2 flex gap-4 font-mono text-[11px] text-paper-muted md:hidden">
                    <span>{fmtSigned(c.pace7)}/day</span>
                    <span>{c.streak}-day streak</span>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
