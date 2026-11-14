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

/** The trainer tables haven't been migrated on this database yet: say what's coming, offer what works. */
export const NotReady = ({ feature }: { feature: "food" | "profile" }) => (
  <SetupNotice
    title={feature === "food" ? "Food tracking unlocks soon" : "Your profile unlocks soon"}
    body={
      <>
        {feature === "food" ? "Calorie counting, meal plans and the food diary are on their way." : "Calorie targets and your personal meal plan are on their way."} Your weigh-ins and gym days already
        power{" "}
        <Link href="/coach" className="font-semibold text-ink underline underline-offset-4">
          Coach
        </Link>{" "}
        and{" "}
        <Link href="/insights" className="font-semibold text-ink underline underline-offset-4">
          Insights
        </Link>
        .
      </>
    }
    cta={{ href: "/log", label: "Log today" }}
  />
);
