import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowUpRight } from "lucide-react";
import { MomentumCard } from "@/components/progress/consistency-card";
import { GainHeatmap } from "@/components/progress/gain-heatmap";
import { GoalTrack } from "@/components/progress/goal-track";
import { CountUp } from "@/components/progress/count-up";
import { TrajectoryChart } from "@/components/progress/trajectory-chart";
import { Avatar, Brand } from "@/components/shell/brand";
import { fmt, fmtCompact, fmtDate, fmtDateShort, fmtPct, fmtSigned } from "@/lib/format";
import { GOAL, milestones } from "@/lib/progress";
import { cardPath, cardVersion, getPublicProgress } from "@/lib/public";
import { ProfileSkeleton } from "./profile-skeleton";
import { RaceInvite } from "./race-invite";
import { RankGap, RankLadder } from "./rank-ladder";
import { getPublicShareData } from "@/lib/share-data";
import { buildShareCard, isShareKind } from "@/lib/share-cards";

type Props = { params: Promise<{ handle: string }> };

/** "+1.9K" / "−1.2K": signed and short, for phone-width stat cells. */
const fmtSignedCompact = (n: number) => `${n >= 0 ? "+" : "−"}${fmtCompact(Math.abs(n))}`;

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
            className="inline-flex h-10 shrink-0 items-center whitespace-nowrap rounded-lg bg-primary px-4 text-sm font-semibold max-[359px]:px-3 text-primary-foreground transition-colors hover:bg-primary-hover active:bg-primary-pressed"
          >
            Track your own
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 sm:py-12">
        <Suspense fallback={<ProfileSkeleton />}>
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
  // Highest single-day gain (earliest day wins a tie).
  const best = rows.reduce<{ gain: number; date: string } | null>(
    (b, r) => (r.delta !== null && r.delta > 0 && (!b || r.delta > b.gain) ? { gain: r.delta, date: r.date } : b),
    null,
  );

  return (
    <div className="rise-in flex flex-col gap-6 lg:gap-8">
      <section className="flex items-center justify-between gap-3 sm:items-end sm:gap-6">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Avatar name={name} src={profile.avatar_url} className="size-12 shrink-0 text-base sm:size-16 sm:text-lg" />
          <div className="min-w-0">
            <h1 className="truncate text-xl leading-tight font-bold tracking-[-0.025em] sm:text-[2rem]">{name}</h1>
            <a
              href={`https://x.com/${profile.handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="-my-2 block truncate py-2 font-mono text-sm font-semibold text-primary underline-offset-4 hover:underline sm:text-base"
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
          className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover active:bg-primary-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:h-14 sm:gap-2 sm:rounded-xl sm:px-8 sm:text-lg"
        >
          <span className="sm:hidden">X<span className="max-[359px]:hidden"> profile</span></span>
          <span className="hidden sm:inline">View X profile</span>
          <ArrowUpRight className="size-4 sm:size-5" aria-hidden />
        </a>
      </section>

      {!latest ? (
        <section className="panel-dark rounded-2xl p-8 text-sm text-muted-foreground">
          @{profile.handle} hasn&apos;t logged any impressions yet.
        </section>
      ) : (
        <div className="rise-in grid gap-6 lg:grid-cols-3">
          {/* Row 1: the total and the road to 500K (wide) + rank and latest day */}
          <section className="panel-dark rounded-2xl p-5 sm:p-6 lg:col-span-2">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
              <p className="hidden font-mono text-[2.5rem] leading-none font-semibold tracking-[-0.04em] sm:block sm:text-[3.25rem]">
                <CountUp value={latest.total} duration={1400} />
                <span className="ml-3 font-sans text-base font-medium tracking-normal text-muted-foreground">/ 500K</span>
              </p>
              <p className="text-sm text-muted-foreground">
                {data.eta ? (
                  <>
                    <span className="sm:hidden">est.</span>
                    <span className="hidden sm:inline">500K around</span>{" "}
                    <span className="font-mono font-semibold text-primary">{fmtDate(data.eta.etaDate)}</span>
                  </>
                ) : (
                  `Last logged ${fmtDate(latest.date)}`
                )}
              </p>
            </div>
            <GoalTrack total={latest.total} milestones={milestones(rows, data.pace7)} />
          </section>

          {/* Phones: rank and best day side by side. sm and up: big rank on top, best day below. */}
          <section aria-label="Rank and best day" className="panel-dark grid grid-cols-2 rounded-2xl sm:flex sm:flex-col">
            <Link
              href="/leaderboard"
              aria-label={rank ? `Leaderboard rank ${rank.rank} of ${rank.of}` : "Leaderboard"}
              className="group flex flex-col justify-center rounded-l-2xl p-3 transition-colors hover:bg-hover sm:flex-1 sm:rounded-l-none sm:rounded-t-2xl sm:p-6"
            >
              <span className="text-xs text-muted-foreground sm:text-sm">
                <span className="sm:hidden">Rank</span>
                <span className="hidden sm:inline">Leaderboard</span>
              </span>
              <div className="mt-1 flex items-end justify-between gap-3">
                <span className="font-mono text-[2.5rem] leading-none font-semibold tracking-[-0.05em] text-primary sm:text-[3rem]">
                  {rank ? (
                    <>
                      #<CountUp value={rank.rank} duration={700} />
                    </>
                  ) : (
                    "—"
                  )}
                  {rank && <span className="ml-1 text-sm font-medium tracking-normal text-subtle">/{fmt(rank.of)}</span>}
                </span>
                {rank && rank.of > 1 && <RankLadder rank={rank} className="hidden w-28 sm:flex" />}
              </div>
              {rank && rank.of > 1 && <RankLadder rank={rank} className={rank.rank === 1 ? "mt-6 sm:hidden" : "mt-3 sm:hidden"} />}
              {rank && (
                <span className="mt-2 block">
                  <RankGap rank={rank} />
                </span>
              )}
            </Link>
            <div className="contents sm:block sm:border-t sm:border-hairline">
              {/* The highest single-day gain and the day it happened */}
              <div
                className="flex flex-col justify-center border-l border-hairline p-3 sm:block sm:border-l-0 sm:p-4"
                aria-label={best ? `Best day: ${fmtSigned(best.gain)} on ${fmtDate(best.date)}` : "No best day yet"}
              >
                <p className="text-xs text-muted-foreground">Best day</p>
                <p className="mt-1 font-mono text-[2rem] leading-none font-semibold tracking-[-0.05em] min-[360px]:text-[2.5rem] sm:text-lg sm:leading-normal sm:tracking-normal">
                  {best ? (
                    <>
                      <span className="sm:hidden">{fmtSignedCompact(best.gain)}</span>
                      <span className="hidden sm:inline">{fmtSigned(best.gain)}</span>
                      <span className="ml-1.5 hidden text-xs font-medium tracking-normal text-subtle sm:inline">{fmtDateShort(best.date)}</span>
                    </>
                  ) : (
                    "—"
                  )}
                </p>
                {best && <p className="mt-1.5 font-mono text-xs text-subtle sm:hidden">{fmtDateShort(best.date)}</p>}
              </div>
            </div>
          </section>

          {/* Row 2: trajectory (wide) + momentum */}
          {rows.length > 1 && (
            <section className="panel-dark rounded-2xl p-5 sm:p-6 lg:col-span-2">
              <h2 className="mb-6 text-xl font-bold tracking-[-0.015em]">Cumulative impressions</h2>
              <TrajectoryChart rows={rows} eta={data.eta} pace={data.pace7} />
            </section>
          )}
          {rows.length > 1 && (
            <MomentumCard rows={rows} today={today} />
          )}

          {/* Row 3: daily gains (full width) */}
          <section className="panel-dark rounded-2xl p-5 sm:p-6 lg:col-span-3">
            <h2 className="mb-5 text-xl font-bold tracking-[-0.015em]">Daily gains</h2>
            <GainHeatmap rows={rows} today={today} />
          </section>

          {/* Row 4: invite as a race: every public page promotes progresshub */}
          <RaceInvite handle={profile.handle} total={latest.total} />
        </div>
      )}

      <p className="text-center text-xs text-subtle">Totals are self-reported daily from X analytics.</p>
    </div>
  );
}
