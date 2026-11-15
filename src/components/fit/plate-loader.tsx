/**
 * The fit loader: three bumper plates keep sliding onto a short steel sleeve (the `plate-loop`
 * keyframes in fit.css). Static under reduced motion. Decorative: pair it with visible text
 * ("Saving…") or aria-busy on the control.
 */
export function PlateLoader({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md";
  className?: string;
}) {
  const h = size === "sm" ? "h-4" : "h-5";
  const w = size === "sm" ? "w-1" : "w-1.5";
  return (
    <span
      className={`relative inline-flex items-center ${className}`}
      aria-hidden
    >
      <span className="absolute inset-x-[-3px] top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-steel/70" />
      <span className="plate-loop relative flex items-center gap-[2px]">
        <span className={`${h} ${w} rounded-[2px] bg-plate-chest`} />
        <span className={`${h} ${w} rounded-[2px] bg-plate-back`} />
        <span className={`${h} ${w} rounded-[2px] bg-plate-legs`} />
      </span>
    </span>
  );
}
