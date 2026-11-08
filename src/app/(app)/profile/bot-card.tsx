"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BellRing, Check, Loader2, RefreshCw, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type Result = { ok: boolean; url?: string; error?: string };

type Props = {
  id: string;
  channel: string;
  icon: LucideIcon;
  /** Shown after opening the app, to re-check the link. */
  doneLabel: string;
  link: { remind: boolean; linkedAt: string } | null;
  /** The bot's chat URL, or null if it isn't configured on this site. */
  openUrl: string | null;
  connectAction: (tz: unknown) => Promise<Result>;
  remindAction: (on: unknown) => Promise<Result>;
  disconnectAction: () => Promise<Result>;
};

/** Connect a progresshub chat bot: daily reminders, logging by message, stats with share links. */
export function BotCard({ id, channel, icon: Icon, doneLabel, link, openUrl, connectAction, remindAction, disconnectAction }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [problem, setProblem] = useState<string | null>(null);
  const [opened, setOpened] = useState(false);
  const titleId = `${id}-title`;

  const connect = () =>
    start(async () => {
      setProblem(null);
      const res = await connectAction(Intl.DateTimeFormat().resolvedOptions().timeZone);
      if (!res.ok) return setProblem(res.error ?? "Something went wrong.");
      setOpened(true);
      window.location.assign(res.url!); // opens the chat app (or its web version) on the bot with the code
    });

  const run = (fn: () => Promise<Result>) =>
    start(async () => {
      setProblem(null);
      const res = await fn();
      if (!res.ok) setProblem(res.error ?? "Something went wrong.");
      router.refresh();
    });

  return (
    <section aria-labelledby={titleId} className="panel-dark rounded-2xl">
      <div className="flex items-center justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary-soft text-primary" aria-hidden>
            <Icon className="size-4" />
          </span>
          <h2 id={titleId} className="text-sm font-semibold">
            {channel} bot
          </h2>
        </div>
        {link && (
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 px-2.5 py-1 font-mono text-xs text-primary">
            <Check className="size-3" strokeWidth={3} aria-hidden /> connected
          </span>
        )}
      </div>

      {link ? (
        <div className="mt-4 divide-y divide-hairline border-t border-hairline">
          <div className="flex items-center gap-3 px-5 py-3.5 sm:px-6">
            <BellRing className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Daily reminder</span>
              <span className="block text-xs text-muted-foreground">When you haven&apos;t logged by evening</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={link.remind}
              aria-label={`${channel} daily reminder`}
              disabled={pending}
              onClick={() => run(() => remindAction(!link.remind))}
              className={cn(
                "relative h-6 w-11 shrink-0 rounded-full border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50",
                link.remind ? "border-primary bg-primary" : "border-border bg-surface-highest",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 size-4.5 rounded-full transition-[left]",
                  link.remind ? "left-[22px] bg-primary-foreground" : "left-0.5 bg-foreground/70",
                )}
              />
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
            <span className="font-mono text-xs text-subtle">linked {fmtDate(link.linkedAt.slice(0, 10))}</span>
            <div className="flex gap-2">
              {openUrl && (
                <a
                  href={openUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-xs font-semibold text-foreground transition-colors hover:bg-hover"
                >
                  Open bot
                </a>
              )}
              <Button
                variant="ghost"
                disabled={pending}
                onClick={() => run(disconnectAction)}
                className="h-9 px-3 text-xs font-semibold text-muted-foreground hover:bg-hover hover:text-foreground"
              >
                Disconnect
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-5 pt-3 pb-5 sm:px-6 sm:pb-6">
          <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            <li>⏰ A nudge on days you haven&apos;t logged</li>
            <li>📝 Log by sending a number, like 28,400 or +1,200</li>
            <li>🏆 Rank, streak and milestones, each with a share-on-X link</li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              onClick={connect}
              disabled={pending || !openUrl}
              className="h-10 gap-2 bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover active:bg-primary-pressed"
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}
              Connect {channel}
            </Button>
            {opened && (
              <Button
                variant="outline"
                onClick={() => router.refresh()}
                className="h-10 gap-2 border-border bg-transparent px-4 text-sm font-semibold text-foreground hover:bg-hover"
              >
                <RefreshCw className="size-4" /> {doneLabel}
              </Button>
            )}
          </div>
          {!openUrl && <p className="mt-2 text-xs text-subtle">The bot isn&apos;t set up on this site yet.</p>}
        </div>
      )}

      {problem && (
        <p role="alert" className="px-5 pb-4 text-sm font-medium text-foreground sm:px-6">
          {problem}
        </p>
      )}
    </section>
  );
}
