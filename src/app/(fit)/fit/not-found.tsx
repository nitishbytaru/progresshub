import type { Metadata } from "next";
import Link from "next/link";
import { Barbell } from "@/components/fit/barbell";

export const metadata: Metadata = { title: "Page not found" };

/** Fit 404: an unloaded bar inside the fit header, pointing back to Home and Log. */
export default function FitNotFound() {
  return (
    <section aria-labelledby="fit-404" className="card-in flex flex-col items-center gap-8 py-14 text-center sm:py-20">
      <div className="w-full max-w-md">
        <Barbell days={[]} unit="kg" animate={false} />
      </div>
      <div className="flex flex-col items-center gap-2">
        <p className="font-display text-8xl leading-none font-bold tracking-[-0.02em]">404</p>
        <h1 id="fit-404" className="font-display text-3xl font-bold uppercase">
          Missed rep
        </h1>
        <p className="max-w-[34ch] text-ink-variant">There&apos;s no page here. Your logs are safe.</p>
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
