"use client";

import type { CSSProperties } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PLATE, fmtWeight, muscleLabel, type Muscle, type Unit } from "@/lib/fit-units";

export type BarDay = { day: string; muscles: Muscle[]; kg: number | null };

const utc = (d: string) => new Date(`${d}T00:00:00Z`);
const dayName = new Intl.DateTimeFormat("en", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });

/**
 * A bumper plate seen edge-on. One band per muscle trained that day (in the group's IWF colour);
 * a gym day with no muscles tagged is a black training plate with a steel rim.
 */
export function PlateFace({ muscles, dim = false, className = "" }: { muscles: Muscle[]; dim?: boolean; className?: string }) {
  return (
    <span
      className={`flex flex-col overflow-hidden rounded-[3px] transition-opacity duration-300 ${
        muscles.length ? "" : "border border-steel/80 bg-steel/30"
      } ${dim ? "opacity-20" : ""} ${className}`}
      aria-hidden
    >
      {muscles.map((m) => (
        <span key={m} className="flex-1" style={{ background: PLATE[m].fill }} />
      ))}
    </span>
  );
}

/**
 * The week as a loaded barbell: one plate per gym day on each sleeve, loaded collar-outward in day order
 * (the bar is always loaded symmetrically). Plates slide on with a small overshoot; tapping one shows its day.
 */
export function Barbell({
  days,
  unit,
  highlight = null,
  size = "lg",
  animate = true,
}: {
  days: BarDay[];
  unit: Unit;
  highlight?: Muscle | null;
  size?: "lg" | "sm";
  animate?: boolean;
}) {
  const lg = size === "lg";
  const plateH = lg ? "h-32 sm:h-40 lg:h-52" : "h-14";
  const plateW = lg ? "w-3.5 sm:w-4.5 lg:w-6" : "w-2";
  const dim = (m: Muscle[]) => highlight !== null && !m.includes(highlight);

  const sleeve = (side: -1 | 1) => (
    <div className={`flex items-center ${lg ? "gap-[3px]" : "gap-[2px]"} ${side === -1 ? "flex-row-reverse" : ""}`}>
      {/* Inner collar: plates load outward from here. */}
      <span className={`shrink-0 rounded-[2px] bg-steel ${lg ? "mx-0.5 h-9 w-2" : "h-4 w-1"}`} aria-hidden />
      {days.map((d, i) => {
        const style = { "--from": side, "--i": i } as CSSProperties;
        const face = <PlateFace muscles={d.muscles} dim={dim(d.muscles)} className={`${plateH} ${plateW}`} />;
        if (!lg) {
          return (
            <span key={d.day} className={animate ? "plate-load" : ""} style={style}>
              {face}
            </span>
          );
        }
        return (
          <Popover key={d.day}>
            <PopoverTrigger
              className={`reveal-anim rounded-[4px] outline-offset-2 ${animate ? "plate-load" : ""}`}
              style={style}
              aria-label={`${dayName.format(utc(d.day))}: ${d.muscles.length ? d.muscles.map(muscleLabel).join(", ") : "gym, no muscles tagged"}`}
            >
              {face}
            </PopoverTrigger>
            <PopoverContent side="top" className="w-56 gap-2 p-3">
              <p className="text-sm font-semibold">{dayName.format(utc(d.day))}</p>
              {d.muscles.length ? (
                <ul className="flex flex-wrap gap-1.5">
                  {d.muscles.map((m) => (
                    <li
                      key={m}
                      className="rounded-full px-2 py-0.5 text-xs font-bold"
                      style={{ background: PLATE[m].fill, color: PLATE[m].ink }}
                    >
                      {muscleLabel(m)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-ink-subtle">No muscles tagged</p>
              )}
              {d.kg !== null && (
                <p className="font-display text-2xl font-bold">
                  {fmtWeight(d.kg, unit)} <span className="text-sm text-ink-subtle">{unit}</span>
                </p>
              )}
            </PopoverContent>
          </Popover>
        );
      })}
    </div>
  );

  return (
    <div className="relative flex items-center justify-center">
      {/* The bar: steel shaft with knurling, collars, and sleeves running the full width. */}
      <span
        className={`absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-full bg-steel ${lg ? "h-2.5" : "h-1.5"}`}
        aria-hidden
      />
      <span
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ${lg ? "h-2.5 w-[18%]" : "h-1.5 w-[14%]"}`}
        style={{ background: "repeating-linear-gradient(90deg, var(--track) 0 2px, var(--steel) 2px 4px)" }}
        aria-hidden
      />
      <div className={`relative flex w-full items-center justify-between ${lg ? "px-1" : ""}`}>
        <div className="flex items-center">
          <span className={`rounded-sm bg-steel ${lg ? "h-6 w-2.5" : "h-3 w-1"}`} aria-hidden />
          <div className={lg ? "ml-1" : "ml-0.5"} />
        </div>
        <div className="flex flex-1 items-center justify-between">
          <div className={`flex justify-end ${lg ? "w-[38%]" : "w-[40%]"}`}>{sleeve(-1)}</div>
          <div className={`flex ${lg ? "w-[38%]" : "w-[40%]"}`}>{sleeve(1)}</div>
        </div>
        <span className={`rounded-sm bg-steel ${lg ? "h-6 w-2.5" : "h-3 w-1"}`} aria-hidden />
      </div>
    </div>
  );
}
