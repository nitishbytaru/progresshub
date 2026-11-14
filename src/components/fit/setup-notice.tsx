import Link from "next/link";
import type { ReactNode } from "react";
import { Barbell } from "./barbell";

/** Shown when a page needs something first: the server tables, a profile, or data. */
export function SetupNotice({ title, body, cta }: { title: string; body: ReactNode; cta?: { href: string; label: string } }) {
  return (
    <section className="card-in mx-auto flex w-full max-w-xl flex-col items-center gap-5 py-12 text-center">
      <div className="w-full max-w-sm opacity-70">
        <Barbell days={[]} unit="kg" animate={false} />
      </div>
      <h2 className="font-display text-3xl font-bold uppercase">{title}</h2>
      <div className="max-w-[40ch] text-ink-variant">{body}</div>
      {cta && (
        <Link href={cta.href} className="inline-flex h-12 items-center rounded-full bg-primary px-6 font-bold text-primary-foreground transition-colors hover:bg-primary-hover">
          {cta.label}
        </Link>
      )}
    </section>
  );
}

/** The trainer tables haven't been migrated on this database yet. */
export const NotReady = () => (
  <SetupNotice title="Almost ready" body="This part of the coach is being set up on the server. Weight and gym logging already work." cta={{ href: "/log", label: "Log weight" }} />
);
