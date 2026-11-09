import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowUpRight } from "lucide-react";
import { ConsistencyCard } from "@/components/progress/consistency-card";
import { GainHeatmap } from "@/components/progress/gain-heatmap";
import { GoalTrack } from "@/components/progress/goal-track";
import { MilestoneBadges } from "@/components/progress/milestone-badges";
import { PageSkeleton } from "@/components/progress/page-skeleton";
import { TrajectoryChart } from "@/components/progress/trajectory-chart";
import { Avatar, Brand } from "@/components/shell/brand";
import { fmt, fmtDate, fmtPct, fmtSigned } from "@/lib/format";
import { GOAL, milestones, paceOver } from "@/lib/progress";
import { cardPath, cardVersion, getPublicProgress } from "@/lib/public";
import { getPublicShareData } from "@/lib/share-data";
import { buildShareCard, isShareKind } from "@/lib/share-cards";

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params, searchParams }: PageProps<"/u/[handle]">): Promise<Metadata> {
  const [{ handle }, query] = await Promise.all([params, searchParams]);
  const data = await getPublicProgress(handle);
  if (!data) return { title: "Creator not found" };
  const h = data.profile.handle;

  // ?share=<kind> (or a bare ?target=<date>, from older target links): that card's title and image.
  const target = typeof query.target === "string" ? query.target : undefined;
  const kind = isShareKind(query.share) ? query.share : target ? "target" : null;
  if (kind && kind !== "progress") {
    const shareData = await getPublicShareData(h);
    const milestone = typeof query.m === "string" ? Number(query.m) || undefined : undefined;
    const card = shareData && buildShareCard(kind, shareData, { target, milestone });
    if (card?.available) {
      const image = { url: card.imagePath, width: 1200, height: 630, alt: card.title };
      return {
        title: card.title,
        description: card.description,
        openGraph: { title: card.title, description: card.description, type: "profile", siteName: "progresshub", images: [image] },
        twitter: { card: "summary_large_image", title: card.title, description: card.description, images: [image] },
      };
    }
  }

  const total = data.latest?.total ?? 0;
  const rank = data.rank ? `#${data.rank.rank} of ${data.rank.of} · ` : "";
  const description = `${rank}${fmt(total)} / 500,000 impressions on X (${fmtPct((total / GOAL) * 100)}). Follow @${h}'s road to 500K.`;
  const image = {
    url: cardPath(h, cardVersion(data)),
    width: 1200,
    height: 630,
    alt: `@${h}: ${fmt(total)} of 500,000 impressions on X`,
  };
  return {
    title: `@${h} on the road to 500K`,
    description,
    openGraph: { title: `@${h} on the road to 500K`, description, type: "profile", siteName: "progresshub", images: [image] },
    twitter: { card: "summary_large_image", title: `@${h} on the road to 500K`, description, images: [image] },
  };
}

export default function PublicProfilePage({ params }: Props) {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-hairline">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6">
          <Brand />
          <Link
            href="/login"
            className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover active:bg-primary-pressed"
          >
            Track your own
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 sm:py-12">
        <Suspense fallback={<PageSkeleton blocks={["h-[96px]", "h-[260px]", "h-[420px]", "h-[360px]"]} />}>
          <Profile params={params} />
        </Suspense>
      </main>
    </div>
  );
}

async function Profile({ params }: Props) {
  const { handle } = await params;
  const data = await getPublicProgress(handle);
  if (!data) notFound();
  const { profile, latest, rows, rank } = data;
  const name = profile.display_name || profile.handle;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <section className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={name} src={profile.avatar_url} className="size-16 text-lg" />
          <div className="min-w-0">
            <h1 className="truncate text-[1.75rem] leading-tight font-bold tracking-[-0.025em] sm:text-[2rem]">{name}</h1>
            <a
              href={`https://x.com/${profile.handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="-my-2 inline-block py-2 font-mono text-base font-semibold text-primary underline-offset-4 hover:underline"
            >
              @{profile.handle}
            </a>
          </div>
        </div>
        <a
          href={`https://x.com/${profile.handle}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`View @${profile.handle} on X (opens in a new tab)`}
          className="inline-flex h-14 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-8 text-lg font-semibold text-primary-foreground transition-colors hover:bg-primary-hover active:bg-primary-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:w-auto"
        >
          View X profile <ArrowUpRight className="size-5" aria-hidden />
        </a>
      </section>

      {!latest ? (
        <section className="panel-dark rounded-2xl p-8 text-sm text-muted-foreground">
          @{profile.handle} hasn&apos;t logged any impressions yet.
        </section>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Row 1: the total and the road to 500K (wide) + rank and latest day */}
          <section className="panel-dark rounded-2xl p-5 sm:p-6 lg:col-span-2">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
              <p className="hidden font-mono text-[2.5rem] leading-none font-semibold tracking-[-0.04em] sm:block sm:text-[3.25rem]">
                {fmt(latest.total)}
                <span className="ml-3 font-sans text-base font-medium tracking-normal text-muted-foreground">/ 500K</span>
              </p>
              <p className="text-sm text-muted-foreground">
                {data.eta ? (
                  <>
                    500K around <span className="font-mono font-semibold text-primary">{fmtDate(data.eta.etaDate)}</span>
                  </>
                ) : (
                  `Last logged ${fmtDate(latest.date)}`
                )}
              </p>
            </div>
            <GoalTrack total={latest.total} milestones={milestones(rows, data.pace7)} />
          </section>

          <section aria-label="Rank and latest day" className="panel-dark flex flex-col rounded-2xl">
            <Link href="/leaderboard" className="group flex flex-1 flex-col justify-center p-5 transition-colors hover:bg-hover sm:p-6">
              <span className="text-sm text-muted-foreground">Leaderboard</span>
              <span className="mt-1 font-mono text-[3rem] leading-none font-semibold tracking-[-0.05em] text-primary">
                {rank ? `#${rank.rank}` : "—"}
              </span>
              {rank && (
                <span className="mt-1.5 text-xs text-subtle group-hover:text-muted-foreground">
                  of {fmt(rank.of)} {rank.of === 1 ? "creator" : "creators"}
                </span>
              )}
            </Link>
            <div className="grid grid-cols-2 divide-x divide-hairline border-t border-hairline">
              <div className="p-4">
                <p className="text-xs text-muted-foreground">Latest day</p>
                <p className="mt-1 font-mono text-lg font-semibold">{latest.delta === null ? "—" : fmtSigned(latest.delta)}</p>
              </div>
              <div className="p-4">
                <p className="text-xs text-muted-foreground">7-day pace</p>
                <p className="mt-1 font-mono text-lg font-semibold">
                  {fmtSigned(data.pace7)}
                  <span className="text-xs font-medium text-subtle">/day</span>
                </p>
              </div>
            </div>
          </section>

          {/* Row 2: trajectory (wide) + consistency */}
          {rows.length > 1 && (
            <section className="panel-dark rounded-2xl p-5 sm:p-6 lg:col-span-2">
              <h2 className="mb-6 text-xl font-bold tracking-[-0.015em]">Cumulative impressions</h2>
              <TrajectoryChart rows={rows} eta={data.eta} pace={data.pace7} />
            </section>
          )}
          {rows.length > 1 && (
            <ConsistencyCard rows={rows} today={today} streak={data.streak} pace7={data.pace7} pace28={paceOver(rows, 28)} />
          )}

          {/* Row 3: milestones + daily gains (wide) */}
          <MilestoneBadges rows={rows} />
          <section className="panel-dark rounded-2xl p-5 sm:p-6 lg:col-span-2">
            <h2 className="mb-5 text-xl font-bold tracking-[-0.015em]">Daily gains</h2>
            <GainHeatmap rows={rows} today={today} />
          </section>

          {/* Row 4: invite: every public page promotes progresshub */}
          <section className="panel-dark flex flex-col items-start justify-between gap-4 rounded-2xl border-primary/40 p-5 sm:flex-row sm:items-center sm:p-6 lg:col-span-3">
            <div>
              <p className="text-lg font-bold tracking-[-0.015em]">
                Race <span className="text-primary">@{profile.handle}</span> to 500K
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">Log your X impressions daily. Free.</p>
            </div>
            <Link
              href="/login"
              className="inline-flex h-11 shrink-0 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover active:bg-primary-pressed"
            >
              Track your own
            </Link>
          </section>
        </div>
      )}

      <p className="text-center text-xs text-subtle">Totals are self-reported daily from X analytics.</p>
    </div>
  );
}
