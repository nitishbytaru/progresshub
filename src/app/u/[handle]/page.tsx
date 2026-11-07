import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GoalTrack } from "@/components/progress/goal-track";
import { PageSkeleton } from "@/components/progress/page-skeleton";
import { TrajectoryChart } from "@/components/progress/trajectory-chart";
import { Avatar, Brand } from "@/components/shell/brand";
import { fmt, fmtDate, fmtPct, fmtSigned } from "@/lib/format";
import { GOAL, milestones } from "@/lib/progress";
import { cardPath, cardVersion, getPublicProgress } from "@/lib/public";

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const data = await getPublicProgress(handle);
  if (!data) return { title: "Creator not found" };
  const h = data.profile.handle;
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
        <div className="mx-auto flex h-16 max-w-[1000px] items-center justify-between gap-4 px-4 sm:px-6">
          <Brand />
          <Link
            href="/login"
            className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover active:bg-primary-pressed"
          >
            Track your own
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-[1000px] px-4 py-8 sm:px-6 sm:py-12">
        <Suspense fallback={<PageSkeleton blocks={["h-[160px]", "h-[200px]", "h-[400px]"]} />}>
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
              className="font-mono text-base font-semibold text-primary underline-offset-4 hover:underline"
            >
              @{profile.handle}
            </a>
          </div>
        </div>
        {rank && (
          <Link href="/leaderboard" className="group flex flex-col sm:items-end">
            <span className="font-mono text-[2.5rem] leading-none font-semibold tracking-[-0.04em]">#{rank.rank}</span>
            <span className="mt-1 text-sm text-muted-foreground group-hover:text-foreground">
              of {rank.of} {rank.of === 1 ? "creator" : "creators"} on the leaderboard
            </span>
          </Link>
        )}
      </section>

      {!latest ? (
        <section className="panel-dark rounded-2xl p-8 text-sm text-muted-foreground">
          @{profile.handle} hasn&apos;t logged any impressions yet.
        </section>
      ) : (
        <>
          <section className="panel-dark rounded-2xl p-5 sm:p-8">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
              <p className="font-mono text-[2.5rem] leading-none font-semibold tracking-[-0.04em] sm:text-[3.5rem]">
                {fmt(latest.total)}
                <span className="ml-3 font-sans text-base font-medium tracking-normal text-muted-foreground">
                  / 500K impressions
                </span>
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
            <div className="mt-4" />
            <GoalTrack total={latest.total} milestones={milestones(rows, data.pace7)} />
            <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-hairline bg-hairline">
              {[
                { k: "Latest day", v: latest.delta === null ? "—" : fmtSigned(latest.delta) },
                { k: "7-day pace", v: `${fmtSigned(data.pace7)}/day` },
                { k: "Streak", v: `${data.streak} days` },
              ].map((s) => (
                <div key={s.k} className="bg-background p-3 sm:p-4">
                  <dt className="text-xs text-muted-foreground">{s.k}</dt>
                  <dd className="mt-1 font-mono text-base font-semibold sm:text-lg">{s.v}</dd>
                </div>
              ))}
            </dl>
          </section>

          {rows.length > 1 && (
            <section className="panel-dark rounded-2xl p-5 sm:p-8">
              <h2 className="mb-8 text-xl font-bold tracking-[-0.015em]">Cumulative impressions</h2>
              <TrajectoryChart rows={rows} eta={data.eta} pace={data.pace7} />
            </section>
          )}
        </>
      )}

      <p className="text-center text-sm text-muted-foreground">
        Totals are self-reported daily from X analytics.{" "}
        <Link href="/login" className="font-semibold text-foreground underline-offset-4 hover:underline">
          Start tracking your road to 500K
        </Link>
      </p>
    </div>
  );
}
