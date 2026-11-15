import { Suspense } from "react";
import { ArrowRight } from "lucide-react";
import { Barbell, type BarDay } from "@/components/fit/barbell";
import { FitGlyph } from "@/components/fit/fit-glyph";
import { PLATE, type Muscle } from "@/lib/fit-units";
import { LoginLink } from "./login-link";

// A sample week loaded on the bar: one plate per gym day, coloured by muscle.
const SAMPLE: BarDay[] = [
  { day: "2026-01-05", muscles: ["chest", "shoulders", "triceps"], kg: 72.4 },
  { day: "2026-01-06", muscles: ["back", "biceps"], kg: 72.1 },
  { day: "2026-01-07", muscles: ["legs"], kg: 72.3 },
  { day: "2026-01-09", muscles: ["chest", "back"], kg: 71.9 },
  { day: "2026-01-10", muscles: ["shoulders", "biceps", "triceps"], kg: 71.8 },
];

const ROWS: { label: string; value: string; tag: string; muscle: Muscle; fill: number }[] = [
  { label: "Weigh-in", value: "71.8", tag: "7-day trend", muscle: "biceps", fill: 0.8 },
  { label: "Lifts", value: "5/5", tag: "gym days", muscle: "chest", fill: 1 },
  { label: "Food", value: "2,450", tag: "kcal target", muscle: "legs", fill: 0.65 },
];

/** Landing page for signed-out fit visitors (served at / via src/proxy.ts). Sign-in lives at /login. */
export default function FitWelcomePage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[640px] flex-col px-4 pb-12 sm:px-6 md:max-w-[920px] md:px-8">
      <header className="flex h-16 items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-primary">
          <FitGlyph className="size-6" />
          <span className="flex items-baseline gap-1 text-base font-bold tracking-[-0.015em] text-ink">
            progresshub <span className="font-display text-xl tracking-[0.04em] uppercase">fit</span>
          </span>
        </span>
        <Suspense fallback={<span className="h-11 w-[84px]" aria-hidden />}>
          <LoginLink className="inline-flex h-11 items-center rounded-full border border-outline px-5 text-sm font-semibold text-ink-variant transition-colors hover:bg-hover hover:text-ink">
            Log in
          </LoginLink>
        </Suspense>
      </header>

      <main className="flex flex-1 flex-col gap-12 pt-10 sm:pt-16">
        <section className="flex flex-col gap-6">
          <h1 className="font-display text-6xl leading-[0.9] font-bold uppercase sm:text-8xl">
            Log it. <span className="text-ink-subtle">Lift it.</span>
          </h1>
          <p className="max-w-[40ch] text-lg text-ink-variant">Weigh-ins, workouts and food, loaded onto one bar.</p>
          <Suspense fallback={<span className="h-12" aria-hidden />}>
            <LoginLink className="inline-flex h-12 w-fit items-center gap-2 rounded-full bg-primary px-6 text-base font-bold text-primary-foreground transition-colors hover:bg-primary-hover active:bg-primary-pressed">
              Get started <ArrowRight className="size-4" aria-hidden />
            </LoginLink>
          </Suspense>
        </section>

        <section aria-label="A sample week on the bar" className="flex flex-col gap-2">
          <Barbell days={SAMPLE} unit="kg" />
          <p className="text-center font-mono text-xs text-ink-subtle">1 plate = 1 gym day</p>
        </section>

        <dl className="flex flex-col divide-y divide-outline-variant border-y border-outline-variant">
          {ROWS.map((r) => (
            <div key={r.label} className="flex flex-col gap-2 py-4" aria-label={`${r.label}: ${r.value} ${r.tag}`}>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-sm font-semibold text-ink-variant">{r.label}</dt>
                <dd className="font-display text-4xl leading-none font-bold">{r.value}</dd>
              </div>
              <div className="flex items-center gap-3" aria-hidden>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-track">
                  <span className="block h-full rounded-full" style={{ width: `${r.fill * 100}%`, background: PLATE[r.muscle].fill }} />
                </span>
                <span className="font-mono text-xs text-ink-subtle">{r.tag}</span>
              </div>
            </div>
          ))}
        </dl>
      </main>
    </div>
  );
}
