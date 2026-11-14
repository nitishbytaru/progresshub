import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import type { FuelDay } from "@/lib/fit-insights";
import { PLATE, fmtWeight, fromKg, muscleLabel, type Muscle, type Unit } from "@/lib/fit-units";

const utc = (d: string) => new Date(`${d}T00:00:00Z`);
const short = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" });

export function Panel({ label, title, i = 0, className = "", children }: { label: string; title: string; i?: number; className?: string; children: ReactNode }) {
  return (
    <section aria-label={label} className={`card-in flex flex-col gap-4 rounded-2xl border border-outline-variant bg-surface p-4 sm:p-6 ${className}`} style={{ "--card-i": i } as CSSProperties}>
      <h2 className="font-display text-3xl font-bold uppercase">{title}</h2>
      {children}
    </section>
  );
}

/** Push / pull / legs as one segmented bar (chalk shades; groups, not single muscles). */
export function BalanceCard({ push, pull, legs, total }: { push: number; pull: number; legs: number; total: number }) {
  const parts = [
    { l: "Push", v: push, cls: "bg-ink" },
    { l: "Pull", v: pull, cls: "bg-ink-variant" },
    { l: "Legs", v: legs, cls: "bg-steel" },
  ];
  const lowest = total ? parts.reduce((a, b) => (b.v < a.v ? b : a)) : null;
  return (
    <Panel label="Push pull legs balance, 30 days" title="Balance" i={1}>
      {total ? (
        <>
          <div className="flex h-4 overflow-hidden rounded-full bg-track" role="img" aria-label={`Push ${push}, pull ${pull}, legs ${legs} sessions in 30 days`}>
            {parts.map((p) => (
              <span key={p.l} className={`${p.cls} reveal-anim chart-reveal h-full border-r-2 border-surface last:border-r-0`} style={{ width: `${(p.v / total) * 100}%` }} />
            ))}
          </div>
          <dl className="grid grid-cols-3 text-center">
            {parts.map((p) => (
              <div key={p.l}>
                <dt className="flex items-center justify-center gap-1.5 text-xs text-ink-subtle">
                  <span className={`size-2 rounded-full ${p.cls}`} aria-hidden /> {p.l}
                </dt>
                <dd className="font-display text-2xl font-bold">{p.v}</dd>
              </div>
            ))}
          </dl>
          {lowest && lowest.v < Math.max(push, pull, legs) * 0.6 && <p className="text-sm text-ink-variant">{lowest.l} is lagging. The coach puts it first next week.</p>}
        </>
      ) : (
        <p className="text-sm text-ink-subtle">Tag muscles on gym days to see your balance.</p>
      )}
    </Panel>
  );
}

/** Gym days by weekday over 12 weeks: when you actually train. */
export function WeekdayCard({ days }: { days: { label: string; gym: number; weighIns: number; of: number }[] }) {
  const max = Math.max(1, ...days.map((d) => d.gym));
  const best = days.reduce((a, b) => (b.gym > a.gym ? b : a));
  return (
    <Panel label="Training by weekday, 12 weeks" title="Your week" i={2}>
      <div className="flex h-32 items-end gap-2" role="img" aria-label={`Gym days by weekday over 12 weeks: ${days.map((d) => `${d.label} ${d.gym}`).join(", ")}`}>
        {days.map((d, i) => (
          <div key={d.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            <span className="font-display text-sm font-bold text-ink-variant">{d.gym || ""}</span>
            <span className={`reveal-anim chart-grow w-full rounded-md ${d === best && d.gym ? "bg-ink" : "bg-ink-subtle/50"}`} style={{ height: `${Math.max(4, (d.gym / max) * 100)}%`, animationDelay: `${i * 50}ms` }} />
            <span className="text-[0.6875rem] font-bold text-ink-subtle">{d.label}</span>
          </div>
        ))}
      </div>
      <p className="text-sm text-ink-variant">{best.gym ? `${best.label} is your strongest day (${best.gym} of 12 weeks).` : "No gym days in the last 12 weeks."}</p>
    </Panel>
  );
}

/** 30 days of intake (bars) under the 7-day-average weight (line), with the calorie target. */
export function FuelWeightCard({ days, target, unit }: { days: FuelDay[]; target: number | null; unit: Unit }) {
  const W = 600;
  const H = 200;
  const kMax = Math.max(target ?? 0, ...days.map((d) => d.kcal ?? 0), 1) * 1.15;
  const ws = days.map((d) => d.avg).filter((v): v is number => v !== null);
  const wMin = Math.min(...ws) - 0.5;
  const wMax = Math.max(...ws) + 0.5;
  const bw = W / days.length;
  const line = days
    .map((d, i) => (d.avg === null ? null : `${(i * bw + bw / 2).toFixed(1)},${(H - ((d.avg - wMin) / (wMax - wMin)) * H * 0.8 - H * 0.1).toFixed(1)}`))
    .filter(Boolean)
    .join(" L");
  const logged = days.filter((d) => d.kcal !== null);
  return (
    <Panel label="Calories and weight, 30 days" title="Fuel vs weight" i={3}>
      {logged.length < 3 ? (
        <p className="text-sm text-ink-subtle">
          Log food on 3+ days to compare intake with your weight. <Link href="/food" className="font-semibold text-ink underline underline-offset-4">Open Food</Link>
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-subtle">
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-ink-subtle/60" aria-hidden /> kcal eaten</span>
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 bg-ink" aria-hidden /> weight (7d avg)</span>
            {target && <span className="flex items-center gap-1.5"><span className="h-0 w-3 border-t border-dashed border-ink-variant" aria-hidden /> target {target}</span>}
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-44 w-full overflow-visible sm:h-52" role="img" aria-label={`Average intake ${Math.round(logged.reduce((s, d) => s + d.kcal!, 0) / logged.length)} kcal over ${logged.length} logged days`}>
            {days.map((d, i) =>
              d.kcal === null ? null : (
                <rect key={d.day} className="reveal-anim chart-grow" x={i * bw + bw * 0.18} width={bw * 0.64} y={H - (d.kcal / kMax) * H} height={(d.kcal / kMax) * H} rx={2} fill="var(--chalk-subtle)" opacity={0.6} style={{ animationDelay: `${i * 15}ms` }}>
                  <title>{`${short.format(utc(d.day))}: ${Math.round(d.kcal)} kcal`}</title>
                </rect>
              ),
            )}
            {target && <line x1={0} x2={W} y1={H - (target / kMax) * H} y2={H - (target / kMax) * H} stroke="var(--chalk-variant)" strokeDasharray="5 5" vectorEffect="non-scaling-stroke" />}
            {line && <path className="reveal-anim chart-reveal" d={`M${line}`} fill="none" stroke="var(--chalk)" strokeWidth={2.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
          </svg>
          <div className="flex justify-between text-xs font-semibold text-ink-subtle">
            <span>{short.format(utc(days[0].day))}</span>
            <span>
              {ws.length ? `${fmtWeight(ws[0], unit)} → ${fmtWeight(ws.at(-1)!, unit)} ${unit}` : ""}
            </span>
            <span>today</span>
          </div>
        </>
      )}
    </Panel>
  );
}

/** One stat with a label, big stamped number and an optional fill bar. */
export function Meter({ label, value, of, unit }: { label: string; value: number | null; of: number; unit?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold text-ink-variant">{label}</span>
        <span className="font-display text-2xl font-bold">
          {value ?? "—"}
          <span className="text-sm text-ink-subtle">
            {" "}
            / {of}
            {unit ? ` ${unit}` : ""}
          </span>
        </span>
      </div>
      <span className="h-1.5 overflow-hidden rounded-full bg-track" aria-hidden>
        <span className="reveal-anim chart-reveal block h-full rounded-full bg-ink" style={{ width: `${value === null ? 0 : Math.min(1, value / of) * 100}%` }} />
      </span>
    </div>
  );
}

export function StrengthCard({ prs, volume, weeks, unit }: { prs: { key: string; name: string; muscle: Muscle; e1rm: number; weight: number; reps: number; day: string }[]; volume: { muscle: Muscle; perWeek: number[]; sets30: number }[]; weeks: string[]; unit: Unit }) {
  if (!prs.length) {
    return (
      <Panel label="Strength" title="Strength" i={6}>
        <p className="text-sm text-ink-subtle">
          Log sets (exercise, reps, weight) on a gym day to track PRs and weekly volume. <Link href="/log" className="font-semibold text-ink underline underline-offset-4">Open Log</Link>
        </p>
      </Panel>
    );
  }
  const vMax = Math.max(1, ...volume.flatMap((v) => v.perWeek));
  return (
    <Panel label="Strength: personal records and volume" title="Strength" i={6}>
      <ul className="flex flex-col divide-y divide-outline-variant">
        {prs.slice(0, 6).map((p) => (
          <li key={p.key} className="flex items-center gap-3 py-2.5">
            <span className="size-3 shrink-0 rounded-full" style={{ background: PLATE[p.muscle].fill }} aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{p.name}</span>
              <span className="text-xs text-ink-subtle">
                {fmtWeight(p.weight, unit)} {unit} × {p.reps} · {short.format(utc(p.day))}
              </span>
            </span>
            <span className="text-right">
              <span className="block font-display text-2xl leading-none font-bold">{fmtWeight(p.e1rm, unit)}</span>
              <span className="text-[0.625rem] font-bold tracking-wide text-ink-subtle uppercase">est. 1RM</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2 border-t border-outline-variant pt-4">
        <span className="text-xs font-bold tracking-[0.14em] text-ink-subtle uppercase">Weekly volume ({unit} × reps)</span>
        {volume
          .filter((v) => v.perWeek.some(Boolean))
          .map((v) => (
            <div key={v.muscle} className="grid grid-cols-[5.5rem_1fr_auto] items-end gap-3">
              <span className="text-sm font-semibold">{muscleLabel(v.muscle)}</span>
              <span className="flex h-8 items-end gap-[3px]" role="img" aria-label={`${muscleLabel(v.muscle)} volume by week: ${v.perWeek.join(", ")}`}>
                {v.perWeek.map((x, i) => (
                  <span key={weeks[i]} className="flex-1 rounded-[2px]" style={{ height: `${Math.max(2, (x / vMax) * 100)}%`, background: x ? PLATE[v.muscle].fill : "var(--track)" }} />
                ))}
              </span>
              <span className="font-display text-sm font-bold text-ink-variant">{Math.round(fromKg(v.perWeek.at(-1) ?? 0, unit)).toLocaleString()}</span>
            </div>
          ))}
      </div>
    </Panel>
  );
}
