/**
 * Calories as a bumper-plate face: a chalk ring fills toward the target; over target, the overflow
 * continues as a thin inner lap. Chalk only (plate colours are reserved for muscle groups).
 */
export function KcalRing({ eaten, target, size = 168 }: { eaten: number; target: number | null; size?: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const pct = target ? eaten / target : 0;
  const first = Math.min(pct, 1);
  const over = Math.max(0, Math.min(pct - 1, 1));
  const left = target ? Math.round(target - eaten) : null;
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r="48" fill="var(--panel-high)" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--track)" strokeWidth="7" />
        <circle
          className="transition-[stroke-dashoffset] duration-700 ease-out"
          cx="50" cy="50" r={r} fill="none" stroke="var(--chalk)" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - first)}
        />
        {over > 0 && (
          <circle cx="50" cy="50" r={r - 9} fill="none" stroke="var(--chalk-variant)" strokeWidth="3" strokeLinecap="round" pathLength={1} strokeDasharray={`${over} 1`} />
        )}
        <circle cx="50" cy="50" r="13" fill="var(--rubber)" stroke="var(--outline)" strokeWidth="1" />
      </svg>
      <div className="relative flex flex-col items-center text-center" role="img" aria-label={target ? `${Math.round(eaten)} of ${target} kcal eaten, ${left! >= 0 ? `${left} left` : `${-left!} over`}` : `${Math.round(eaten)} kcal eaten`}>
        <span className="font-display text-4xl leading-none font-bold" style={{ fontSize: size * 0.22 }}>{Math.round(eaten)}</span>
        <span className="text-[0.6875rem] font-bold tracking-[0.12em] text-ink-subtle uppercase">
          {target ? (left! >= 0 ? `${left} left` : `${-left!} over`) : "kcal"}
        </span>
      </div>
    </div>
  );
}
