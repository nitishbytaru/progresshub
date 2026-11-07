"use client";

import { useId, useState } from "react";
import { Check, Copy, Link2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { fmt, fmtPct, fmtSigned } from "@/lib/format";
import { GOAL } from "@/lib/progress";
import { cn } from "@/lib/utils";

type Props = {
  handle: string;
  total: number;
  delta: number | null;
  streak: number;
  rank: { rank: number; of: number } | null;
  /** Absolute public URL of the creator page, e.g. https://progresshub24.vercel.app/u/alexbuilds */
  shareUrl: string;
  /** Versioned share-card image path, so the preview never shows stale numbers. */
  imagePath: string;
};

// X counts every link as 23 characters, whatever its real length.
const X_LIMIT = 280;
const X_LINK_LENGTH = 23;

function XLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function defaultText({ handle, total, delta, streak, rank }: Omit<Props, "shareUrl" | "imagePath">) {
  const facts = [delta !== null ? `Latest day: ${fmtSigned(delta)}` : null, streak > 1 ? `${streak}-day streak` : null]
    .filter(Boolean)
    .join(" · ");
  return [
    `I'm at ${fmt(total)} / 500,000 impressions on X (${fmtPct((total / GOAL) * 100)}).`,
    facts || null,
    rank
      ? `Ranked #${rank.rank} of ${rank.of} on progresshub as @${handle}.`
      : `Racing to 500K on progresshub as @${handle}.`,
  ]
    .filter((l) => l !== null)
    .join("\n");
}

export function ShareDialog({ shareUrl, imagePath, ...stats }: Props) {
  const [text, setText] = useState(() => defaultText(stats));
  const [copied, setCopied] = useState<"link" | "text" | null>(null);
  const textId = useId();
  const length = text.length + 1 + X_LINK_LENGTH; // text + newline + link
  const over = length > X_LIMIT;

  const post = () => {
    const url = `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const copy = async (what: "link" | "text") => {
    try {
      await navigator.clipboard.writeText(what === "link" ? shareUrl : `${text}\n${shareUrl}`);
      setCopied(what);
      toast.success(what === "link" ? "Link copied. Paste it in a post on X to show the preview." : "Post text copied");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Couldn't copy. Select the text and copy it manually.");
    }
  };

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            className="h-11 gap-2 border-border bg-transparent px-4 text-sm font-semibold text-foreground hover:bg-hover"
          />
        }
      >
        <Share2 className="size-4" />
        Share on X
      </DialogTrigger>

      <DialogContent className="panel-dark max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-2xl p-0 ring-0 sm:max-w-[920px] [&>[data-slot=dialog-close]]:top-4 [&>[data-slot=dialog-close]]:right-4">
        <div className="border-b border-hairline px-5 py-4 pr-14 sm:px-6">
          <DialogTitle className="text-lg font-bold tracking-[-0.015em] text-foreground">Share your progress</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Your link shows this card when you post it on X.
          </DialogDescription>
        </div>

        <div className="grid gap-6 p-5 sm:p-6 md:grid-cols-[1.2fr_1fr]">
          {/* The real preview image X will unfurl */}
          <div className="flex flex-col gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- generated OG image, shown as-is */}
            <img
              src={imagePath}
              alt={`Preview card for @${stats.handle}`}
              width={1200}
              height={630}
              className="aspect-[1200/630] w-full rounded-xl border border-border bg-background object-cover"
            />
            <div className="flex items-center gap-2 rounded-lg border border-border p-1 pl-3">
              <Link2 className="size-4 shrink-0 text-subtle" />
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground" title={shareUrl}>
                {shareUrl.replace(/^https?:\/\//, "").replace(/\?.*$/, "")}
              </span>
              <Button
                variant="outline"
                onClick={() => copy("link")}
                className="h-9 shrink-0 gap-1.5 border-border bg-transparent px-3 text-sm font-semibold text-foreground hover:bg-hover"
              >
                {copied === "link" ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
                {copied === "link" ? "Copied" : "Copy link"}
              </Button>
            </div>
          </div>

          {/* Post text */}
          <div className="flex flex-col gap-3">
            <label htmlFor={textId} className="text-sm font-semibold text-foreground">
              Post text
            </label>
            <textarea
              id={textId}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              aria-describedby={`${textId}-count`}
              className="min-h-36 w-full resize-y rounded-lg border border-border bg-background p-3 text-sm leading-relaxed text-foreground outline-none focus-visible:border-primary"
            />
            <p id={`${textId}-count`} className={cn("font-mono text-xs", over ? "font-semibold text-foreground" : "text-subtle")}>
              {length} / {X_LIMIT} with link
              {over && ` · ${length - X_LIMIT} over X's limit`}
            </p>

            <div className="mt-auto flex flex-col gap-2 pt-2">
              <Button
                onClick={post}
                disabled={over || text.trim().length === 0}
                className="h-11 gap-2 bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary-hover active:bg-primary-pressed"
              >
                <XLogo className="size-4" />
                Post on X
              </Button>
              <Button
                variant="outline"
                onClick={() => copy("text")}
                className="h-11 gap-2 border-border bg-transparent text-sm font-semibold text-foreground hover:bg-hover"
              >
                {copied === "text" ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
                {copied === "text" ? "Copied" : "Copy text with link"}
              </Button>
              <p className="text-xs text-subtle">X turns your @handle into a link and shows the card above under the post.</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
