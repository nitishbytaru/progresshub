import type { CSSProperties, ReactNode } from "react";

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
    <Panel label="Push pull legs balance, 30 days" title="Balance" i={2}>
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
    <Panel label="Training by weekday, 12 weeks" title="Your week" i={3}>
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
