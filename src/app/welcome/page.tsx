import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BellRing, PenLine, Trophy } from "lucide-react";
import { BrandMark } from "@/components/shell/brand";
import { CountUp, HeroScreen, MotionRoot, Reveal, ScreenFrame, TypedLog, WipeIn } from "@/components/landing/motion-bits";
import { RaceTrack, Stop } from "@/components/landing/race-track";
import { ScoreCheck, ScoreCheckButton } from "@/components/landing/score-check";
import { FinishMark, PhoneChat } from "@/components/landing/telegram-finale";

const SHARE_TITLE = "progresshub: race other X creators to 500K impressions";
const SHARE_DESCRIPTION = "Log your X impressions once a day, see your pace and estimated 500K date, and race every other creator to the same finish line.";
const SHARE_IMAGE = { url: "/landing/og.png", width: 1200, height: 630, alt: "progresshub: One finish line. 500K." };

export const metadata: Metadata = {
  title: { absolute: SHARE_TITLE },
  description: SHARE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { title: SHARE_TITLE, description: SHARE_DESCRIPTION, url: "/", type: "website", siteName: "progresshub", images: [SHARE_IMAGE] },
  twitter: { card: "summary_large_image", title: SHARE_TITLE, description: SHARE_DESCRIPTION, images: [SHARE_IMAGE] },
};

const SIGN_UP = "/login?mode=signup";
const LOG_IN = "/login";

const primary =
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary-hover active:bg-primary-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const secondary =
  "inline-flex h-12 items-center justify-center rounded-xl border border-border px-6 text-base font-semibold text-foreground transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const heading = "text-4xl leading-[1.05] font-bold tracking-[-0.03em] text-balance sm:text-5xl lg:text-6xl";
const lede = "mt-5 max-w-[46ch] text-lg leading-relaxed text-muted-foreground";

/** Phones get the short line; larger screens keep the full sentence. */
function Lede({ short, children }: { short: string; children: React.ReactNode }) {
  return (
    <p className={lede}>
      <span className="sm:hidden">{short}</span>
      <span className="hidden sm:inline">{children}</span>
    </p>
  );
}

const STATS = [
  { label: "Total", node: <CountUp to={146444} className="text-foreground" /> },
  { label: "7-day pace", node: <CountUp to={5028} prefix="+" className="text-foreground" /> },
  { label: "500K estimate", node: <span className="text-primary">Jan 18</span> },
];

const BOT = [
  { icon: BellRing, label: "Nudge", tags: ["missed days"], meaning: "A reminder on days you haven't logged" },
  { icon: PenLine, label: "Log", tags: ["28,400", "+1,200"], meaning: "Send your total, or what you added" },
  { icon: Trophy, label: "Stats", tags: ["rank", "streak", "share"], meaning: "Rank, streak and milestones, each ready to post on X" },
];

export default function WelcomePage() {
  return (
    <MotionRoot>
      <noscript>
        <style>{`[data-reveal]{opacity:1!important;transform:none!important;clip-path:none!important}`}</style>
      </noscript>

      <header className="sticky top-0 z-30 border-b border-hairline bg-background">
        <nav aria-label="Main" className="mx-auto flex h-16 max-w-[1320px] items-center justify-between gap-3 px-5 sm:px-8 lg:px-12">
          <span className="flex items-center gap-2.5">
            <BrandMark className="size-8" />
            <span className="text-lg font-bold tracking-[-0.02em]">progresshub</span>
          </span>
          <span className="flex items-center gap-1 sm:gap-2">
            <Link href={LOG_IN} className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
              Log in
            </Link>
            <Link href={SIGN_UP} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-hover">
              Sign up
            </Link>
          </span>
        </nav>
      </header>

      <ScoreCheck />
      <main className="overflow-x-clip">
        <RaceTrack>
          {/* Hero: the line starts at 0 */}
          <section className="pt-16 pb-24 sm:pt-24 lg:pb-36">
            <h1 className="max-w-[13ch] text-5xl leading-[0.98] font-bold tracking-[-0.04em] text-balance sm:text-7xl lg:text-8xl">
              One finish line. <span className="text-primary">500K.</span>
            </h1>
            <Reveal delay={0.12}>
              <Lede short="Log daily. See your pace and rank.">Log your X impressions once a day. See your pace, your estimated date, and every creator racing to the same number.</Lede>
            </Reveal>
            <Reveal delay={0.24} className="mt-8 flex flex-wrap gap-3">
              <Link href={SIGN_UP} className={primary}>
                Start your race <ArrowRight className="size-4" aria-hidden />
              </Link>
              <ScoreCheckButton className={secondary}>Check your rank</ScoreCheckButton>
              <Link href={LOG_IN} className={secondary}>
                Log in
              </Link>
            </Reveal>
            <div className="mt-16 lg:mt-20">
              <HeroScreen name="overview" alt="The progresshub Overview, showing total impressions, pace and the road to 500,000" priority />
            </div>
          </section>

          {/* Overview */}
          <section className="relative pb-28 lg:pb-40">
            <Stop value="125K" />
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end">
              <Reveal>
                <h2 className={heading}>Know exactly where you stand.</h2>
                <Lede short="Your total, pace and estimated 500K date.">Overview turns your logs into a total, a pace and an estimated date for 500K. It&apos;s an estimate, and it updates with every log.</Lede>
              </Reveal>
              <Reveal delay={0.1}>
                <dl className="divide-y divide-hairline rounded-2xl border border-border">
                  {STATS.map(({ label, node }) => (
                    <div key={label} className="flex items-center justify-between gap-4 px-5 py-4">
                      <dt className="text-sm font-semibold text-muted-foreground">{label}</dt>
                      <dd className="font-mono text-3xl font-semibold tracking-[-0.03em]">{node}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-2 text-right font-mono text-xs text-subtle">from a real account</p>
              </Reveal>
            </div>
          </section>

          {/* Daily progress */}
          <section className="relative pb-28 lg:pb-40">
            <Stop value="250K" />
            <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
              <Reveal>
                <h2 className={heading}>One number a day.</h2>
                <Lede short="Copy it from X analytics. Ten seconds.">Copy your total from X analytics and log it. It takes ten seconds, and it never touches your X account.</Lede>
                <div className="mt-8 max-w-sm">
                  <TypedLog />
                </div>
              </Reveal>
              <Reveal delay={0.1}>
                <ScreenFrame name="progress" alt="The Daily progress page, with the log box, gain for the day and a calendar of logged days" />
              </Reveal>
            </div>
          </section>

          {/* Leaderboard */}
          <section className="relative pb-28 lg:pb-40">
            <Stop value="375K" />
            <Reveal className="max-w-3xl">
              <h2 className={heading}>Same goal. Same board.</h2>
              <Lede short="One goal, so every number compares.">Everyone races to the same 500K, so the numbers finally compare like with like.</Lede>
            </Reveal>
            <div className="mt-10">
              <WipeIn>
                <ScreenFrame name="leaderboard" alt="The leaderboard ranking creators by progress to 500K, with other creators' names blurred" cropClass="aspect-[2880/1120]" />
              </WipeIn>
            </div>
          </section>
        </RaceTrack>

        {/* The finish line: Telegram */}
        <section aria-labelledby="telegram-heading" className="border-t border-primary px-5 pt-12 pb-28 sm:px-8 lg:pb-12">
          <FinishMark />
          <div className="mx-auto mt-10 grid max-w-[1100px] items-center gap-14 lg:grid-cols-2">
            <div>
              <Reveal>
                <h2 id="telegram-heading" className={heading}>
                  Cross it from Telegram.
                </h2>
                <Lede short="Log by text. Get nudged on missed days.">Connect the progresshub bot and your daily log becomes a text message. Miss a day and it nudges you.</Lede>
              </Reveal>
              <ul className="mt-8 divide-y divide-hairline border-y border-hairline">
                {BOT.map(({ icon: Icon, label, tags, meaning }, i) => (
                  <li key={label}>
                    <Reveal delay={i * 0.08} className="flex items-center justify-between gap-3 py-3.5">
                      <span className="flex items-center gap-3">
                        <Icon className="size-4 text-muted-foreground" aria-hidden />
                        <span className="text-sm font-semibold">{label}</span>
                        <span className="sr-only">{meaning}</span>
                      </span>
                      <span className="flex flex-wrap justify-end gap-1.5" aria-hidden>
                        {tags.map((tag) => (
                          <span key={tag} className="rounded-md border border-hairline px-2 py-0.5 font-mono text-xs text-muted-foreground tabular-nums">
                            {tag}
                          </span>
                        ))}
                      </span>
                    </Reveal>
                  </li>
                ))}
              </ul>
              <Reveal delay={0.1} className="mt-8 flex flex-wrap gap-3">
                <Link href={SIGN_UP} className={primary}>
                  Sign up <ArrowRight className="size-4" aria-hidden />
                </Link>
                <Link href={LOG_IN} className={secondary}>
                  Log in
                </Link>
              </Reveal>
            </div>
            <Reveal delay={0.1}>
              <PhoneChat />
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-hairline px-5 py-6">
        <p className="text-center font-mono text-xs text-subtle">progresshub</p>
      </footer>
    </MotionRoot>
  );
}
