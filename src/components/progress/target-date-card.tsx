"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { XShareDialog } from "@/components/progress/share-dialog";
import { Calendar } from "@/components/ui/calendar";
import { fmt, fmtDate, fmtSigned } from "@/lib/format";
import { addDays, MAX_TARGET_YEARS, targetPlan } from "@/lib/progress";

// react-day-picker works in local time; these are plain YYYY-MM-DD calendar days.
const toLocalDate = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day);
};
const fromLocalDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

type Props = {
  /** Latest logged total and its day: the starting point of the countdown. */
  total: number;
  from: string;
  today: string;
  /** Public handle + site origin, for the share link. Omitted = no share button. */
  share?: { handle: string; origin: string };
};

/** Pick any future day; shows the daily gain needed to reach 500K by then. */
export function TargetDateCard({ total, from, today, share }: Props) {
  const firstDay = addDays(today > from ? today : from, 1);
  const lastDay = addDays(from, MAX_TARGET_YEARS * 365);
  const yearEnd = `${today.slice(0, 4)}-12-31`;
  const [target, setTarget] = useState(yearEnd >= firstDay ? yearEnd : `${Number(today.slice(0, 4)) + 1}-12-31`);
  const [month, setMonth] = useState(() => toLocalDate(target));

  const { remaining, days, perDay: needed } = targetPlan(total, from, target);
  const version = encodeURIComponent(`${from}-${total}`);
  const shareText =
    remaining === 0
      ? `I've reached 500K impressions on X. Tracked on progresshub.`
      : [
          `My target: 500K impressions on X by ${fmtDate(target)}.`,
          `That's ${fmtSigned(needed)}/day, ${fmt(remaining)} to go in ${days} ${days === 1 ? "day" : "days"}.`,
          share ? `Tracking it on progresshub as @${share.handle}.` : null,
        ]
          .filter(Boolean)
          .join("\n");

  return (
    <section aria-labelledby="target-title" className="panel-dark flex flex-col rounded-2xl p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <h2 id="target-title" className="text-xl font-bold tracking-[-0.015em]">
          Pick your deadline
        </h2>
        {share && (
          <XShareDialog
            // Fresh post text whenever the picked day changes.
            key={target}
            trigger={
              <button
                type="button"
                aria-label={`Share target ${fmtDate(target)} on X`}
                className="-mt-1 -mr-1 inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-primary transition-colors hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              />
            }
            triggerLabel={<Share2 className="size-4" />}
            title="Share your target"
            description="Your link shows this card when you post it on X."
            defaultText={shareText}
            shareUrl={`${share.origin}/u/${share.handle}?target=${target}&v=${version}`}
            imagePath={`/u/${share.handle}/target-card?d=${target}&v=${version}`}
            imageAlt={`Target card: ${fmtDate(target)}`}
          />
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Choose a day to see what it takes.</p>

      <Calendar
        mode="single"
        required
        weekStartsOn={1}
        today={toLocalDate(today)}
        selected={toLocalDate(target)}
        month={month}
        onMonthChange={setMonth}
        startMonth={toLocalDate(firstDay)}
        endMonth={toLocalDate(lastDay)}
        disabled={[{ before: toLocalDate(firstDay) }, { after: toLocalDate(lastDay) }]}
        onSelect={(d) => d && setTarget(fromLocalDate(d))}
        classNames={{ root: "mt-3 mb-4 w-full" }}
        className="-mx-2 bg-transparent"
      />

      <div className="mt-auto rounded-xl border border-hairline p-5">
        {remaining === 0 ? (
          <p className="text-sm font-semibold">You&apos;ve already reached 500K.</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Target: <span className="font-semibold text-foreground">{fmtDate(target)}</span>
            </p>
            <p className="mt-3 font-mono text-[2.25rem] leading-none font-semibold tracking-[-0.04em] text-primary">
              {fmtSigned(needed)}
              <span className="text-xl tracking-[-0.02em]">/day</span>
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              <span className="font-mono text-foreground">{fmt(remaining)}</span> to go in {days} {days === 1 ? "day" : "days"}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
