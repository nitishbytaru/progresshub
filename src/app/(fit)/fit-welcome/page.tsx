import { Suspense } from "react";
import { FitGlyph } from "@/components/fit/fit-glyph";
import { FitSignIn } from "./fit-sign-in";

/** Boilerplate landing page for signed-out fit visitors. Full design comes later. */
export default function FitWelcomePage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[640px] flex-col px-4 sm:px-6">
      <header className="flex h-16 items-center gap-2 text-primary">
        <FitGlyph className="size-6" />
        <span className="flex items-baseline gap-1 text-base font-bold tracking-[-0.015em] text-ink">
          progresshub <span className="font-display text-xl tracking-[0.04em] uppercase">fit</span>
        </span>
      </header>
      <main className="flex flex-1 flex-col justify-center gap-8 py-12">
        <h1 className="font-display text-6xl leading-[0.9] font-bold uppercase sm:text-7xl">
          Log it. <span className="text-ink-subtle">Lift it.</span>
        </h1>
        <p className="max-w-[40ch] text-lg text-ink-variant">Daily weigh-ins, workouts and food in one place.</p>
        <Suspense fallback={<div className="h-12" aria-hidden />}>
          <FitSignIn />
        </Suspense>
      </main>
    </div>
  );
}
