import { ArrowUpRight } from "lucide-react";
import { FitGlyph } from "./fit-glyph";
import { FitNav } from "./fit-nav";

const MAIN_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Logo, Home | Log tabs, and a way back to progresshub. */
export function FitHeader() {
  return (
    <header className="flex h-16 items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-primary">
        <FitGlyph className="size-6" />
        <span className="hidden items-baseline gap-1 text-base font-bold tracking-[-0.015em] text-ink sm:flex">
          progresshub <span className="font-display text-xl tracking-[0.04em] uppercase">fit</span>
        </span>
      </span>
      <FitNav />
      <a
        href={MAIN_URL}
        aria-label="Back to progresshub"
        className="inline-flex h-10 items-center gap-1 rounded-full border border-outline px-3 text-sm font-semibold text-ink-variant transition-colors hover:bg-hover hover:text-ink sm:px-4"
      >
        <span className="hidden sm:inline">progresshub</span> <ArrowUpRight className="size-4" aria-hidden />
      </a>
    </header>
  );
}
