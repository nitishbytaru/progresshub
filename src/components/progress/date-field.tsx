"use client";

import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  /** YYYY-MM-DD. */
  value: string;
  min?: string;
  max?: string;
  onChange: (day: string) => void;
  "aria-label": string;
  className?: string;
};

/**
 * Phones: one date field that opens the phone's own date picker, instead of a full month grid.
 * Days outside min/max are ignored, matching the calendar's disabled days.
 */
export function DateField({ value, min, max, onChange, className, ...rest }: Props) {
  return (
    <label
      className={cn(
        "relative flex h-12 items-center gap-3 rounded-xl border border-hairline bg-surface-high px-4 transition-colors focus-within:border-foreground focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary",
        className,
      )}
    >
      <CalendarDays className="size-4 shrink-0 text-primary" aria-hidden />
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        aria-label={rest["aria-label"]}
        onChange={(e) => {
          const day = e.target.value;
          if (!day || (min && day < min) || (max && day > max)) return;
          onChange(day);
        }}
        className="w-full min-w-0 bg-transparent font-mono text-base text-foreground caret-primary outline-none [color-scheme:dark]"
      />
    </label>
  );
}
