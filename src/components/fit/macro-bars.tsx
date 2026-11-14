/** Protein / carbs / fat against targets, set like a nutrition label: label, stamped grams, thin bar. */
export function MacroBars({ totals, targets }: { totals: { protein: number; carbs: number; fat: number }; targets: { protein: number; carbs: number; fat: number } | null }) {
  const rows = [
    { label: "Protein", v: totals.protein, t: targets?.protein, key: true },
    { label: "Carbs", v: totals.carbs, t: targets?.carbs },
    { label: "Fat", v: totals.fat, t: targets?.fat },
  ];
  return (
    <dl className="flex w-full flex-col divide-y divide-outline-variant">
      {rows.map((r) => {
        const pct = r.t ? Math.min(1, r.v / r.t) : 0;
        return (
          <div key={r.label} className="flex flex-col gap-1.5 py-2.5 first:pt-0 last:pb-0">
            <div className="flex items-baseline justify-between">
              <dt className={`text-sm ${r.key ? "font-bold" : "font-semibold text-ink-variant"}`}>{r.label}</dt>
              <dd className="font-display text-xl font-bold">
                {Math.round(r.v)}
                <span className="text-sm text-ink-subtle">{r.t ? ` / ${r.t} g` : " g"}</span>
              </dd>
            </div>
            {r.t ? (
              <span className="h-1.5 overflow-hidden rounded-full bg-track" aria-hidden>
                <span className={`block h-full rounded-full transition-[width] duration-700 ${r.key ? "bg-ink" : "bg-ink-variant"}`} style={{ width: `${pct * 100}%` }} />
              </span>
            ) : null}
          </div>
        );
      })}
    </dl>
  );
}
