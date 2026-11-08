"use client";

import { motion, type Variants } from "motion/react";
import { Check } from "lucide-react";

const EASE = [0.16, 1, 0.3, 1] as const;

/** The finish: the rings expand once as the 500K number lands. */
export function FinishMark() {
  return (
    <div className="relative flex justify-center py-6">
      {[0, 0.18, 0.36].map((delay) => (
        <motion.span
          key={delay}
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-1/2 size-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary"
          initial={{ opacity: 0, scale: 0.4 }}
          whileInView={{ opacity: [0, 0.8, 0], scale: [0.4, 3.4] }}
          viewport={{ once: true, margin: "0px 0px -25% 0px" }}
          transition={{ duration: 1.5, delay, ease: EASE }}
        />
      ))}
      <motion.p
        data-reveal
        className="relative font-mono text-7xl font-semibold tracking-[-0.04em] text-primary tabular-nums sm:text-8xl"
        initial={{ opacity: 0, scale: 0.7 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "0px 0px -25% 0px" }}
        transition={{ type: "spring", stiffness: 180, damping: 14 }}
      >
        500K
      </motion.p>
    </div>
  );
}

const script: Variants = { show: { transition: { staggerChildren: 0.7, delayChildren: 0.25 } } };
const bubble: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: EASE } },
};

const Bot = ({ children }: { children: React.ReactNode }) => (
  <motion.div variants={bubble} data-reveal className="max-w-[88%] self-start rounded-2xl rounded-bl-sm border border-border px-3.5 py-2.5 text-sm leading-snug">
    {children}
  </motion.div>
);

/** An example conversation, in the real bot's wording. */
export function PhoneChat() {
  return (
    <div className="mx-auto w-full max-w-[350px] rounded-[2rem] border border-border bg-background p-2">
      <div className="flex items-center justify-between rounded-t-[1.6rem] border-b border-hairline px-4 py-3">
        <span className="text-sm font-semibold">progresshub bot</span>
        <span className="font-mono text-xs text-subtle">example chat</span>
      </div>
      <motion.div
        variants={script}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "0px 0px -20% 0px" }}
        className="flex min-h-[370px] flex-col gap-2.5 px-3 py-4"
      >
        <Bot>
          Hey, you haven&apos;t updated today&apos;s progress yet.
          <span className="mt-1.5 block text-muted-foreground">
            Just reply here with your total, like <b className="text-foreground">28,400</b>.
          </span>
        </Bot>

        <motion.div variants={bubble} data-reveal className="self-end rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 font-mono text-sm font-semibold text-primary-foreground tabular-nums">
          28,400
        </motion.div>

        <Bot>
          Save <b>28,400</b> for today?
          <span className="mt-1.5 block text-muted-foreground">
            That&apos;s <b className="text-foreground">+1,200</b> since yesterday.
          </span>
          <span className="mt-2.5 grid grid-cols-2 gap-1.5 text-xs font-semibold">
            <span className="rounded-lg bg-foreground py-1.5 text-center text-background">Save</span>
            <span className="rounded-lg border border-border py-1.5 text-center">Cancel</span>
          </span>
        </Bot>

        <Bot>
          <span className="flex items-center gap-1.5 font-semibold">
            <Check className="size-3.5 text-primary" strokeWidth={3} aria-hidden /> Logged <span className="font-mono tabular-nums">28,400</span>
          </span>
          <span className="mt-1.5 block font-mono text-xs text-muted-foreground">
            <span aria-hidden className="mr-2 inline-block h-1.5 w-20 overflow-hidden rounded-full bg-surface-highest align-middle"><span className="block h-full w-[5.7%] bg-primary" /></span>5.7% of 500K
          </span>
        </Bot>
      </motion.div>
    </div>
  );
}
