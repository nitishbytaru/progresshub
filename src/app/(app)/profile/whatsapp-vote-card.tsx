"use client";

import { useState, useTransition } from "react";
import { Check, Coffee, Info, Loader2, MessageCircle, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { fmt } from "@/lib/format";
import { voteForWhatsApp } from "./whatsapp-vote-action";

type Props = {
  voted: boolean;
  /** Everyone's votes so far. */
  votes: number;
};

/** Hidden for now. Set to true to bring the button back. */
const SHOW_BUY_ME_A_COFFEE = false as boolean;

const outline ="h-10 border-border bg-transparent text-foreground hover:bg-hover dark:border-border dark:bg-transparent dark:hover:bg-hover";

/** Stands in for the WhatsApp bot's connect card until the bot opens to the public. */
export function WhatsAppVoteCard({ voted: votedBefore, votes }: Props) {
  const [voted, setVoted] = useState(votedBefore);
  const [pending, start] = useTransition();
  const [problem, setProblem] = useState<string | null>(null);
  const count = votes + (voted && !votedBefore ? 1 : 0); // shows the new vote before the page refreshes

  const vote = () =>
    start(async () => {
      setProblem(null);
      const res = await voteForWhatsApp();
      if (res.ok) setVoted(true);
      else setProblem(res.error);
    });

  return (
    <section aria-labelledby="whatsapp-title" className="panel-dark divide-y divide-hairline rounded-2xl">
      <div className="flex items-center justify-between gap-3 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary-soft text-primary" aria-hidden>
            <MessageCircle className="size-4" />
          </span>
          <h2 id="whatsapp-title" className="text-sm font-semibold whitespace-nowrap">
            WhatsApp bot
          </h2>
        </div>
        <span className="shrink-0 rounded-full border border-border px-2.5 py-1 font-mono text-xs whitespace-nowrap text-muted-foreground">coming soon</span>
      </div>

      <div
        className="flex items-center justify-between gap-4 px-5 py-5 sm:px-6"
        aria-label={`${fmt(count)} ${count === 1 ? "vote" : "votes"} for WhatsApp so far${voted ? ", including yours" : ""}`}
        role="group"
      >
        <span className="text-sm font-semibold text-muted-foreground">Votes</span>
        <span className="flex flex-col items-end gap-1">
          <span className="font-mono text-4xl leading-none font-semibold tracking-[-0.04em] text-primary tabular-nums">{fmt(count)}</span>
          <span className="font-mono text-xs text-subtle">{voted ? "yours counted" : count === 0 ? "be the first" : "so far"}</span>
        </span>
      </div>

      <div className="flex flex-wrap gap-2 px-5 py-4 sm:px-6">
        <div className="flex min-w-[min(100%,18rem)] flex-1 gap-2">
          {voted ? (
            <Button disabled className="h-10 min-w-0 flex-1 gap-2 border border-primary/40 bg-transparent px-4 text-sm font-semibold text-primary disabled:opacity-100">
              <Check className="size-4" strokeWidth={3} aria-hidden />
              Voted
            </Button>
          ) : (
            <Button
              onClick={vote}
              disabled={pending}
              className="h-auto min-h-10 min-w-0 flex-1 gap-2 border-primary bg-primary bg-clip-border px-4 py-2 whitespace-normal text-sm font-semibold text-primary-foreground hover:bg-primary-hover active:bg-primary-pressed"
            >
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ThumbsUp className="size-4" aria-hidden />}
              Vote for WhatsApp connectivity
            </Button>
          )}

          <Dialog>
            <DialogTrigger render={<Button variant="outline" aria-label="About WhatsApp voting" className={`${outline} w-10 shrink-0 p-0`} />}>
              <Info className="size-4" aria-hidden />
            </DialogTrigger>
            <DialogContent className="panel-dark gap-0 rounded-2xl p-6 ring-0 sm:max-w-[400px] [&>[data-slot=dialog-close]]:top-4 [&>[data-slot=dialog-close]]:right-4">
              <DialogTitle className="pr-8 text-lg font-bold tracking-[-0.015em] text-foreground">WhatsApp is on the way</DialogTitle>
              <DialogDescription className="mt-2 text-sm text-muted-foreground">
                Want the progresshub bot on WhatsApp? Cast your vote. We&apos;re trying to bring it soon.
              </DialogDescription>
            </DialogContent>
          </Dialog>
        </div>

        {SHOW_BUY_ME_A_COFFEE && (
          <Button type="button" variant="outline" className={`${outline} w-full gap-2 px-4 text-sm font-semibold sm:w-auto`}>
            <Coffee className="size-4" aria-hidden />
            Buy me a coffee
          </Button>
        )}
      </div>

      {problem && (
        <p role="alert" className="px-5 py-3 text-sm font-medium text-foreground sm:px-6">
          {problem}
        </p>
      )}
    </section>
  );
}
