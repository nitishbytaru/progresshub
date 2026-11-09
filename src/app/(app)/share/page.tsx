import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { PageSkeleton } from "@/components/progress/page-skeleton";
import { getProgress } from "@/lib/data";
import { getOrigin, getRank } from "@/lib/public";
import { buildShareCard, reachedMilestones, SHARE_KINDS } from "@/lib/share-cards";
import { ShareGrid } from "./share-grid";

export const metadata: Metadata = { title: "Share on X" };

type ShareSearchParams = Promise<{ score?: string }>;

async function ScoreNotice({ searchParams }: { searchParams: ShareSearchParams }) {
  const { score } = await searchParams;
  if (score === "saved") {
    return <p role="status" className="rounded-xl border border-border p-3 text-sm">Your impressions are in today&apos;s log.</p>;
  }
  if (score === "skipped") {
    return (
      <p role="status" className="rounded-xl border border-border p-3 text-sm">
        We couldn&apos;t add that number. It may not fit your earlier logs.{" "}
        <Link href="/progress" className="font-semibold underline-offset-4 hover:underline">
          Open Progress
        </Link>
      </p>
    );
  }
  return null;
}

export default function SharePage({ searchParams }: { searchParams: ShareSearchParams }) {
  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <header>
        <h1 className="text-[1.75rem] leading-tight font-bold tracking-[-0.025em] sm:text-[2rem]">
          Share on <span className="text-primary">X</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Pick a card. Every post links back to your progresshub page.</p>
      </header>
      <Suspense fallback={null}>
        <ScoreNotice searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<PageSkeleton blocks={["h-[300px]", "h-[300px]"]} />}>
        <Cards />
      </Suspense>
    </div>
  );
}

async function Cards() {
  const p = await getProgress();
  const handle = p.profile.handle;

  if (!handle || !p.profile.is_public) {
    return (
      <div className="panel-dark rounded-2xl p-6 text-sm text-muted-foreground">
        Sharing needs a public profile with your X username.{" "}
        <Link href="/profile" className="font-semibold text-foreground underline-offset-4 hover:underline">
          Open Profile
        </Link>
      </div>
    );
  }

  const [rank, origin] = await Promise.all([getRank(p.profile.id), getOrigin()]);
  const data = { handle, rows: p.rows, latest: p.latest, streak: p.streak, rank, eta: p.eta, today: p.today };
  const cards = SHARE_KINDS.map((kind) => buildShareCard(kind, data));
  // One ready-made card per milestone passed, so the Milestone tile can switch between them.
  const milestones = reachedMilestones(p.rows).map((m) => ({
    ...m,
    card: buildShareCard("milestone", data, { milestone: m.target }),
  }));
  return <ShareGrid cards={cards} milestones={milestones} origin={origin} />;
}
