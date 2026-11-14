import type { CSSProperties } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { InView } from "@/components/progress/in-view";
import { addDays, type FitStats } from "@/lib/fit-stats";
import { fmtWeight, fromKg, type Unit } from "@/lib/fit-units";
import { Barbell } from "./barbell";

const utc = (d: string) => new Date(`${d}T00:00:00Z`);
const shortDate = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" });
const fmtDay = (d: string) => shortDate.format(utc(d));

/** Nothing logged yet: an empty bar and one way forward. */
export function EmptyHome() {
  return (
    <section aria-label="Get started" className="card-in mx-auto flex w-full max-w-2xl flex-col items-center gap-6 py-10 text-center md:py-16">
      <div className="w-full">
        <Barbell days={[]} unit="kg" animate={false} />
      </div>
      <div className="flex flex-col items-center gap-2">
        <h2 className="font-display text-4xl font-bold tracking-[-0.01em] uppercase">The bar is empty</h2>
        <p className="max-w-[34ch] text-ink-variant">Log a weigh-in and your gym days to start loading it.</p>
      </div>
      <Link
        href="/log"
        className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-base font-bold text-primary-foreground transition-colors hover:bg-primary-hover active:bg-primary-pressed"
      >
        <Plus className="size-4" aria-hidden /> Log today
      </Link>
    </section>
  );
}

/** Today's weight, stamped big, with the 30-day change and the 7-day average, low and high. */
export function WeightBlock({ s, unit }: { s: FitStats; unit: Unit }) {
  const latest = s.latest!;
  const change = s.change30 === null ? null : fromKg(s.change30, unit);
  const arrow = change === null || change === 0 ? "" : change > 0 ? "▲" : "▼";
  return (
    <section aria-label="Body weight" className="card-in flex flex-col items-center pt-2 pb-1 text-center" style={{ "--card-i": 1 } as CSSProperties}>
      <p className="font-display text-[5.5rem] leading-[0.85] font-bold tracking-[-0.02em] sm:text-[6rem]">
        {fmtWeight(latest.kg, unit)}
        <span className="ml-1 text-[1.75rem] tracking-normal text-ink-subtle sm:text-4xl">{unit}</span>
      </p>
      <p className="mt-2 text-sm text-ink-variant">
        {fmtDay(latest.day)}
        {change !== null && (
          <>
            {" · "}
            <span className="font-semibold text-ink" aria-label={`${change > 0 ? "up" : change < 0 ? "down" : "no change"} ${Math.abs(change).toFixed(1)} ${unit} since ${s.change30From}`}>
              {arrow}
              {Math.abs(change).toFixed(1)} {unit}
            </span>{" "}
            since {fmtDay(s.change30From!)}
          </>
        )}
      </p>
      <dl className="mt-5 grid w-full grid-cols-3 divide-x divide-outline-variant border-y border-outline-variant">
        {[
          { label: "7-day avg", value: s.avg7 },
          { label: "Low · 90d", value: s.low?.kg ?? null },
          { label: "High · 90d", value: s.high?.kg ?? null },
        ].map((m) => (
          <div key={m.label} className="flex flex-col gap-0.5 py-3">
            <dt className="text-xs text-ink-subtle">{m.label}</dt>
            <dd className="font-display text-2xl font-bold">{m.value === null ? "—" : fmtWeight(m.value, unit)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Logging consistency: the last 30 days as chalk marks. */
export function LoggedCard({ s, today, loggedDays }: { s: FitStats; today: string; loggedDays: Set<string> }) {
  const days = Array.from({ length: 30 }, (_, i) => addDays(today, i - 29));
  return (
    <InView aria-label="Logging, last 30 days" className="card-in border-t border-outline-variant pt-4 md:col-span-12" style={{ "--card-i": 5 } as CSSProperties}>
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-bold tracking-[0.14em] text-ink-variant uppercase">Weigh-ins · 30 days</h2>
        <p className="font-display text-xl font-bold">
          {s.logged30}
          <span className="text-ink-subtle"> / 30</span>
        </p>
      </div>
      {/* Tally marks: one stroke per day, chalked when you weighed in. */}
      <ol className="mt-3 flex items-end justify-between gap-[3px]" aria-label={`Logged ${s.logged30} of the last 30 days`}>
        {days.map((d, i) => (
          <li
            key={d}
            title={`${fmtDay(d)}${loggedDays.has(d) ? ": logged" : ""}`}
            className={`reveal-anim chart-grow h-6 flex-1 rounded-full md:h-9 md:max-w-2.5 ${loggedDays.has(d) ? "bg-ink-variant" : "bg-track"} ${
              d === today ? "outline-2 outline-offset-2 outline-ink" : ""
            } ${(i + 1) % 7 === 0 ? "mr-1.5" : ""}`}
            style={{ animationDelay: `${i * 14}ms` }}
          />
        ))}
      </ol>
      <div className="mt-1.5 flex justify-between text-[0.625rem] font-bold text-ink-subtle">
        <span>{fmtDay(days[0])}</span>
        <span>today</span>
      </div>
    </InView>
  );
}
