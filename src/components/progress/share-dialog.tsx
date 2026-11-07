"use client";

import { useId, useState } from "react";
import { Copy, Share2 } from "lucide-react";
import { toast } from "sonner";
import { BrandMark } from "@/components/shell/brand";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { fmt, fmtCompact, fmtPct, fmtSigned } from "@/lib/format";
import { GOAL } from "@/lib/progress";
import { cn } from "@/lib/utils";

type Props = {
  name: string;
  handle: string;
  total: number;
  delta: number | null;
  streak: number;
};

const X_LIMIT = 280;

function XLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function ShareDialog({ name, handle, total, delta, streak }: Props) {
  const pct = (total / GOAL) * 100;
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [text, setText] = useState(
    [
      `I'm at ${fmt(total)} / 500,000 impressions on X (${fmtPct(pct)}).`,
      delta !== null ? `Today: ${fmtSigned(delta)}.` : null,
      streak > 1 ? `${streak}-day logging streak.` : null,
      "",
      "Racing to 500K in public with progresshub.",
    ]
      .filter((l) => l !== null)
      .join("\n"),
  );
  const textId = useId();
  const over = text.length > X_LIMIT;

  const post = () => {
    window.open(`https://x.com/intent/post?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Post text copied");
    } catch {
      toast.error("Couldn't copy. Select the text and copy it manually.");
    }
  };

  const dark = theme === "dark";

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            className="h-11 gap-2 border-border bg-transparent px-4 text-sm font-semibold text-foreground hover:bg-surface"
          />
        }
      >
        <Share2 className="size-4" />
        Share on X
      </DialogTrigger>

      <DialogContent className="panel-dark max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-2xl bg-surface-low p-0 ring-0 shadow-[0_24px_64px_#000000b3] sm:max-w-[880px] [&>[data-slot=dialog-close]]:top-4 [&>[data-slot=dialog-close]]:right-4">
        <div className="border-b border-hairline px-5 py-4 pr-14 sm:px-6">
          <DialogTitle className="text-lg font-bold tracking-[-0.015em] text-foreground">
            Share your progress
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Post where you stand on the road to 500K.
          </DialogDescription>
        </div>

        <div className="grid gap-6 p-5 sm:p-6 md:grid-cols-[1.15fr_1fr]">
          {/* Card preview */}
          <div className="flex flex-col gap-3">
            <div
              className={cn(
                "flex aspect-[16/9] flex-col justify-between rounded-xl p-4 sm:p-5",
                dark ? "border border-hairline bg-background text-foreground" : "bg-paper text-paper-foreground",
              )}
              style={dark ? { background: "radial-gradient(ellipse at top, #26262a 0%, #0b0b0c 70%)" } : undefined}
              aria-label="Preview of the progress card"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-bold tracking-[-0.02em]">
                  <BrandMark className="size-6" />
                  progresshub
                </span>
                <span className={cn("font-mono text-[11px]", dark ? "text-subtle" : "text-paper-muted")}>
                  @{handle}
                </span>
              </div>

              <div>
                <p className={cn("text-xs", dark ? "text-muted-foreground" : "text-paper-muted")}>
                  {name}&apos;s road to 500K
                </p>
                <p className="font-mono text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                  {fmt(total)}
                </p>
              </div>

              <div>
                <div className="mb-2 flex justify-between font-mono text-[11px]">
                  <span className={dark ? "text-primary" : "font-semibold"}>{fmtPct(pct)}</span>
                  <span className={dark ? "text-subtle" : "text-paper-muted"}>
                    {delta !== null && `${fmtSigned(delta)} today · `}
                    {fmtCompact(GOAL)} goal
                  </span>
                </div>
                <div className={cn("h-2 overflow-hidden rounded-full", dark ? "bg-surface-highest" : "bg-paper-dim")}>
                  <div
                    className={cn("h-full rounded-full bg-primary", !dark && "ring-1 ring-paper-foreground/20")}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <div role="radiogroup" aria-label="Card style" className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Card</span>
              {(["dark", "light"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={theme === t}
                  onClick={() => setTheme(t)}
                  className={cn(
                    "h-7 rounded-full px-3 font-medium capitalize transition-colors",
                    theme === t
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-surface hover:text-foreground",
                  )}
                >
                  {t}
                </button>
              ))}
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
              rows={7}
              aria-describedby={`${textId}-count`}
              className="min-h-40 w-full resize-y rounded-lg border border-border bg-background p-3 text-sm leading-relaxed text-foreground outline-none focus-visible:border-primary"
            />
            <p
              id={`${textId}-count`}
              className={cn("font-mono text-xs", over ? "font-semibold text-foreground" : "text-subtle")}
            >
              {text.length} / {X_LIMIT}
              {over && ` · ${text.length - X_LIMIT} over X's limit`}
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
                onClick={copy}
                className="h-11 gap-2 border-border bg-transparent text-sm font-semibold text-foreground hover:bg-surface"
              >
                <Copy className="size-4" />
                Copy text
              </Button>
              <p className="text-xs text-subtle">
                Opens X in a new tab with your text. Attach a screenshot of the card if you want the visual.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
