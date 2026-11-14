import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Tip, WeekPlan } from "@/lib/fit-coach";
import type { Targets, Totals } from "@/lib/fit-nutrition";
import { PlateFace } from "./barbell";
import { KcalRing } from "./kcal-ring";

const card = "card-in group flex flex-col gap-3 rounded-2xl border border-outline-variant bg-surface p-4 transition-colors hover:border-outline sm:p-5";
const head = (label: string) => (
  <span className="flex items-center justify-between text-xs font-bold tracking-[0.14em] text-ink-variant uppercase">
    {label}
    <ArrowRight className="size-4 text-ink-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden />
  </span>
);

/** Home: today's fuel, next week's plan and the top coach tip, each a doorway to its page. */
export function CoachStrip({ totals, targets, plan, tip }: { totals: Totals; targets: Targets | null; plan: WeekPlan; tip: Tip | null }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3 md:col-span-12 lg:gap-6">
      <Link href="/food" className={card} style={{ ["--card-i" as string]: 2 }}>
        {head("Today's fuel")}
        <div className="flex items-center gap-4">
          <KcalRing eaten={totals.kcal} target={targets?.kcal ?? null} size={104} />
          <div className="flex flex-col">
            <span className="text-xs text-ink-subtle">Protein</span>
            <span className="font-display text-3xl leading-none font-bold">
              {Math.round(totals.protein)}
              <span className="text-base text-ink-subtle">{targets ? ` / ${targets.protein} g` : " g"}</span>
            </span>
          </div>
        </div>
      </Link>
      <Link href="/coach" className={card} style={{ ["--card-i" as string]: 3 }}>
        {head(`Next week · ${plan.sessions} days`)}
        <ol className="grid grid-cols-7 gap-1" aria-label={`Next week: ${plan.days.filter((d) => d.muscles.length).map((d) => `${d.weekday} ${d.muscles.join(" and ")}`).join("; ")}`}>
          {plan.days.map((d) => (
            <li key={d.day} className="flex flex-col items-center gap-1">
              <span className="flex h-16 w-full flex-col justify-end gap-[2px] rounded-md bg-background p-[3px]">
                {d.muscles.map((m) => (
                  <PlateFace key={m} muscles={[m]} className="h-full max-h-4 w-full rounded-[2px]" />
                ))}
              </span>
              <span className="text-[0.625rem] font-bold text-ink-subtle">{d.weekday.charAt(0)}</span>
            </li>
          ))}
        </ol>
        <span className="text-sm text-ink-variant">{plan.split}</span>
      </Link>
      <Link href="/coach" className={card} style={{ ["--card-i" as string]: 4 }}>
        {head("Coach says")}
        <p className={`text-base ${tip?.strong ? "font-semibold text-ink" : "text-ink-variant"}`}>{tip?.text ?? "You're on track. Keep logging."}</p>
      </Link>
    </div>
  );
}
