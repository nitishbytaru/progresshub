import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { FitGlyph } from "@/components/fit/fit-glyph";
import { FitSignIn } from "../fit-sign-in";

export const metadata: Metadata = { title: "Log in" };

/** Fit sign-in (served at /login via src/proxy.ts). Same Google account as progresshub. */
export default function FitLoginPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[640px] flex-col px-4 sm:px-6">
      <header className="flex h-16 items-center">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-ink-variant transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden /> Back
        </Link>
      </header>
      <main className="flex flex-1 flex-col justify-center gap-6 py-12">
        <FitGlyph className="size-10 text-primary" />
        <h1 className="font-display text-5xl leading-[0.9] font-bold uppercase sm:text-6xl">
          Log in to <span className="text-ink-subtle">fit</span>
        </h1>
        <p className="max-w-[40ch] text-ink-variant">Use the Google account you use on progresshub.</p>
        <Suspense fallback={<div className="h-12" aria-hidden />}>
          <FitSignIn />
        </Suspense>
      </main>
    </div>
  );
}
