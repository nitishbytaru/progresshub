import Link from "next/link";
import { ArrowUpRight, UserRound } from "lucide-react";
import { FitGlyph } from "./fit-glyph";
import { FitNav } from "./fit-nav";

const MAIN_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Logo, tabs (md+), Me (profile & settings) and a way back to progresshub. */
export function FitHeader() {
  return (
    <header className="flex h-16 items-center justify-between gap-3">
      <Link href="/" className="flex min-h-11 items-center gap-2 text-primary" aria-label="progresshub fit home">
        <FitGlyph className="size-6" />
        <span className="flex items-baseline gap-1 text-base font-bold tracking-[-0.015em] text-ink">
          <span className="hidden sm:inline">progresshub</span> <span className="font-display text-xl tracking-[0.04em] uppercase">fit</span>
        </span>
      </Link>
      <FitNav />
      <div className="flex items-center gap-2">
        <Link
          href="/me"
          aria-label="Me: profile and settings"
          className="grid size-11 place-items-center rounded-full border border-outline text-ink-variant transition-colors hover:bg-hover hover:text-ink"
        >
          <UserRound className="size-[18px]" aria-hidden />
        </Link>
        <a
          href={MAIN_URL}
          aria-label="Back to progresshub" title="Back to progresshub"
          className="inline-flex h-11 min-w-11 items-center justify-center gap-1 rounded-full border border-outline px-3 text-sm font-semibold text-ink-variant transition-colors hover:bg-hover hover:text-ink sm:px-4"
        >
          <span className="hidden lg:inline">progresshub</span> <ArrowUpRight className="size-4" aria-hidden />
        </a>
      </div>
    </header>
  );
}
