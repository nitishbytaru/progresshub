"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Lock, Share2 } from "lucide-react";
import { XShareDialog } from "@/components/progress/share-dialog";
import { Button } from "@/components/ui/button";
import { fmtCompact, fmtDateShort } from "@/lib/format";
import type { ShareCard } from "@/lib/share-cards";
import { cn } from "@/lib/utils";

type MilestoneOption = { target: number; date: string; card: ShareCard };

/** One tile per shareable stat: the real X preview image and a Share button. Locked tiles say what unlocks them. */
export function ShareGrid({ cards, milestones, origin }: { cards: ShareCard[]; milestones: MilestoneOption[]; origin: string }) {
  return (
    <ul className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {cards.map((c) =>
        c.kind === "milestone" && milestones.length > 1 ? (
          <MilestoneTile key={c.kind} options={milestones} origin={origin} />
        ) : (
          <Tile key={c.kind} card={c} origin={origin} />
        ),
      )}
    </ul>
  );
}

/** Milestone tile with a chip per milestone passed (newest picked first), each showing the day it was reached. */
function MilestoneTile({ options, origin }: { options: MilestoneOption[]; origin: string }) {
  const [picked, setPicked] = useState(options[options.length - 1].target);
  const current = options.find((o) => o.target === picked) ?? options[options.length - 1];
  return (
    <Tile card={current.card} origin={origin}>
      <div role="radiogroup" aria-label="Milestone to share" className="flex gap-1.5 overflow-x-auto px-4 pt-3 pb-1 [mask-image:linear-gradient(to_right,black_85%,transparent)] [scrollbar-width:thin]">
        {[...options].reverse().map((o) => {
          const on = o.target === picked;
          return (
            <button
              key={o.target}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`${fmtCompact(o.target)}, reached ${fmtDateShort(o.date)}`}
              onClick={() => setPicked(o.target)}
              className={cn(
                "flex shrink-0 flex-col items-start rounded-lg border px-2.5 py-1.5 text-left font-mono transition-colors",
                on ? "border-primary bg-primary-soft" : "border-hairline hover:bg-hover",
              )}
            >
              <span className={cn("flex items-center gap-1 text-xs font-semibold", on ? "text-primary" : "text-foreground")}>
                {on && <Check className="size-3" strokeWidth={3} aria-hidden />}
                {fmtCompact(o.target)}
              </span>
              <span className="text-[10px] text-subtle">{fmtDateShort(o.date)}</span>
            </button>
          );
        })}
      </div>
    </Tile>
  );
}

function Tile({ card: c, origin, children }: { card: ShareCard; origin: string; children?: React.ReactNode }) {
  return (
    <li className={cn("panel-dark flex flex-col overflow-hidden rounded-2xl", !c.available && "opacity-60")}>
      {c.available ? (
        // eslint-disable-next-line @next/next/no-img-element -- generated OG image, shown as-is
        <img
          key={c.imagePath}
          src={c.imagePath}
          alt={c.title}
          width={1200}
          height={630}
          loading="lazy"
          className="aspect-[1200/630] w-full border-b border-hairline bg-background object-cover"
        />
      ) : (
        <div className="flex aspect-[1200/630] w-full flex-col items-center justify-center gap-2 border-b border-hairline">
          <Lock className="size-5 text-muted-foreground" aria-hidden />
          <span className="font-mono text-xs text-subtle">{c.lock}</span>
        </div>
      )}

      {children}

      <div className="mt-auto flex items-center justify-between gap-3 p-4">
        <div className="flex min-w-0 items-baseline gap-3">
          <h2 className="text-base font-semibold">{c.name}</h2>
          {c.kind === "target" && c.available && (
            <Link
              href="/analytics"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              change date <ArrowRight className="size-3" />
            </Link>
          )}
        </div>
        {c.available ? (
          <XShareDialog
            // Fresh post text when the picked milestone changes.
            key={c.sharePath}
            trigger={
              <Button className="h-9 shrink-0 gap-1.5 bg-primary px-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover active:bg-primary-pressed" />
            }
            triggerLabel={
              <>
                <Share2 className="size-4" /> Share
              </>
            }
            title={`Share your ${c.name.toLowerCase()}`}
            description="Your link shows this card when you post it on X."
            defaultText={c.postText}
            shareUrl={`${origin}${c.sharePath}`}
            imagePath={c.imagePath}
            imageAlt={c.title}
          />
        ) : (
          <span className="sr-only">Locked: {c.lock}</span>
        )}
      </div>
    </li>
  );
}
