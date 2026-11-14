"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fmtDate, fmtSigned } from "@/lib/format";
import { cn } from "@/lib/utils";

export type Scenario = { days: 7 | 28; pace: number; eta: { etaDate: string; daysLeft: number } | null };

/**
 * Phones: the 500K forecast as one glanceable card instead of two squeezed columns.
 * Big lime date up top, then label + number rows. A small 7d/28d menu in the corner
 * switches which pace the forecast uses.
 */
export function EtaCardMobile({ scenarios }: { scenarios: Scenario[] }) {
  const [days, setDays] = useState<7 | 28>(7);
  const [menuOpen, setMenuOpen] = useState(false);
  const s = scenarios.find((x) => x.days === days) ?? scenarios[0];

  const rows = [
    { label: "Pace", value: `${fmtSigned(s.pace)}`, tag: "/day" },
    { label: "Days", value: s.eta ? String(s.eta.daysLeft) : "—", tag: "to go" },
  ];

  return (
    <div className="sm:hidden">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold tracking-[-0.015em]">Reach 500K</h2>
        {/* A styled menu (not a native <select>, whose popup varies by browser and phone). */}
        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger
            render={
              <button
                type="button"
                aria-label={`Forecast pace: ${days} days. Change`}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 font-mono text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  menuOpen ? "border-primary text-primary" : "border-border text-foreground",
                )}
              />
            }
          >
            {days} days
            <ChevronDown className={cn("size-3.5 transition-transform", menuOpen && "rotate-180")} aria-hidden />
          </PopoverTrigger>
          <PopoverContent align="end" className="w-44 gap-0 p-1">
            <p className="px-3 pt-2 pb-1 font-mono text-[11px] text-subtle">pace over</p>
            {([7, 28] as const).map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={days === d}
                onClick={() => {
                  setDays(d);
                  setMenuOpen(false);
                }}
                className={cn(
                  "flex h-11 items-center justify-between rounded-lg px-3 text-sm transition-colors hover:bg-hover",
                  days === d ? "font-semibold text-primary" : "text-foreground",
                )}
              >
                {d} days
                {days === d && <Check className="size-4" strokeWidth={2.5} aria-hidden />}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      </div>

      {/* The answer, big: when 500K lands at this pace. */}
      <p
        className="mt-3 font-mono text-[2rem] leading-none font-semibold tracking-[-0.04em] text-primary"
        aria-label={s.eta ? `Estimated 500K on ${fmtDate(s.eta.etaDate)} at your ${days}-day pace` : "No estimate yet at this pace"}
      >
        {s.eta ? fmtDate(s.eta.etaDate) : "—"}
      </p>
      <p className="mt-1 font-mono text-xs text-subtle">at {days}-day pace</p>

      {/* Pace and days fold away under the date; tap to open. */}
      <details className="group mt-4 border-y border-hairline">
        <summary className="flex h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
          <span>
            Pace <span className="text-subtle">&amp;</span> days
          </span>
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <dl className="grid grid-cols-2 divide-x divide-hairline border-t border-hairline">
          {rows.map((r, i) => (
            <div key={r.label} className={i === 0 ? "py-2.5 pr-3" : "py-2.5 pl-3"}>
              <dt className="text-xs text-muted-foreground">{r.label}</dt>
              <dd className="mt-0.5 font-mono text-lg font-semibold tracking-[-0.02em] whitespace-nowrap">
                {r.value}
                <span className="ml-1 text-xs font-normal text-subtle">{r.tag}</span>
              </dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
}
