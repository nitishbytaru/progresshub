import Link from "next/link";
import { Plus } from "lucide-react";

/** Quiet loading frame: panel outlines in the final layout's shape, no shimmer. */
export function PageSkeleton({ blocks }: { blocks: string[] }) {
  return (
    <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8" aria-busy="true" aria-label="Loading">
      {blocks.map((h, i) => (
        <div key={i} className={`animate-pulse rounded-2xl border border-hairline ${h}`} />
      ))}
    </div>
  );
}

/** Shown wherever there's nothing to chart yet. */
export function FirstLogPrompt({ title, body }: { title: string; body: string }) {
  return (
    <section className="panel-dark flex flex-col items-start gap-4 rounded-2xl p-6 sm:p-10">
      <h2 className="text-xl font-bold tracking-[-0.015em]">{title}</h2>
      <p className="max-w-[52ch] text-sm text-muted-foreground">{body}</p>
      <Link
        href="/progress"
        className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover active:bg-primary-pressed"
      >
        <Plus className="size-4" strokeWidth={2.5} /> Log today&apos;s impressions
      </Link>
    </section>
  );
}
