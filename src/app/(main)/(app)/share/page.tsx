import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { PageSkeleton } from "@/components/progress/page-skeleton";
import { getProgress } from "@/lib/data";
import { getOrigin, getRacers, getRank } from "@/lib/public";
import { buildRichCard } from "@/lib/rich-card";
import { buildShareCard, reachedMilestones, SHARE_KINDS, type ShareCard } from "@/lib/share-cards";
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
    <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8">
      <header className="max-sm:absolute">
        <h1 className="sr-only sm:not-sr-only text-[1.75rem] leading-tight font-bold tracking-[-0.025em] sm:text-[2rem]">
          Share on <span className="text-primary">X</span>
        </h1>
        <p className="mt-1 hidden text-sm text-muted-foreground sm:block">Pick a card. Every post links back to your progresshub page.</p>
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

  const [rank, origin, { racers, racing }] = await Promise.all([getRank(p.profile.id), getOrigin(), getRacers(p.profile.id)]);
  const data = {
    handle,
    rows: p.rows,
    latest: p.latest,
    streak: p.streak,
    rank,
    eta: p.eta,
    today: p.today,
    avatarUrl: p.profile.avatar_url,
    racers,
    racing,
  };
  const site = origin.replace(/^https?:\/\//, "");
  // Each card with the props for its animated in-app version (the same design X gets as a PNG).
  const withRich = (card: ShareCard) => ({ ...card, rich: buildRichCard(card, data, site) });
  const cards = SHARE_KINDS.map((kind) => withRich(buildShareCard(kind, data)));
  // One ready-made card per milestone passed, so the Milestone tile can switch between them.
  const milestones = reachedMilestones(p.rows).map((m) => ({
    ...m,
    card: withRich(buildShareCard("milestone", data, { milestone: m.target })),
  }));
  return <ShareGrid cards={cards} milestones={milestones} origin={origin} />;
}
