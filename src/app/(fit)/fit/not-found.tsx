import type { Metadata } from "next";
import Link from "next/link";
import { FitGlyph } from "@/components/fit/fit-glyph";

export const metadata: Metadata = { title: "Page not found" };

/** Fit 404: Carbon Ice, inside the fit header, pointing back to Home and Log. */
export default function FitNotFound() {
  return (
    <section aria-labelledby="fit-404" className="card-in flex flex-col items-center gap-6 py-16 text-center sm:py-24">
      <span className="relative grid size-24 place-items-center rounded-[28px] border border-outline-variant bg-surface">
        <FitGlyph className="fit-ascent size-12 text-primary" />
      </span>
      <div className="flex flex-col items-center gap-2">
        <span className="font-mono text-6xl font-semibold tracking-[-0.05em] text-primary sm:text-7xl">404</span>
        <h1 id="fit-404" className="text-2xl font-bold tracking-[-0.02em]">
          Missed rep.
        </h1>
        <p className="max-w-[32ch] text-base text-ink-variant">This page doesn&apos;t exist. Your logs are safe.</p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="inline-flex h-12 items-center rounded-full bg-primary px-6 text-base font-bold text-primary-foreground transition-colors hover:bg-primary-hover active:bg-primary-pressed"
        >
          Go to Home
        </Link>
        <Link
          href="/log"
          className="inline-flex h-12 items-center rounded-full border border-outline px-6 text-base font-semibold text-ink-variant transition-colors hover:bg-hover hover:text-ink"
        >
          Log weight
        </Link>
      </div>
    </section>
  );
}
