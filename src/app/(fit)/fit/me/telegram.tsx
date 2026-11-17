"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, RefreshCw, Send, Unlink } from "lucide-react";
import { PlateLoader } from "@/components/fit/plate-loader";
import { fitError, fitToast } from "@/components/fit/fit-toast";
import { createFitTelegramLink, disconnectFitTelegram } from "./telegram-actions";

const EXAMPLES = ["72.4", "gym chest triceps", "lunch 2 roti dal", "today"];
const EASE = [0.2, 0.9, 0.25, 1] as const;

/** Link the fit Telegram bot: one tap opens the bot with a one-time code; once linked, log by chat. */
export function FitTelegram({ linkedAt, botUsername }: { linkedAt: string | null; botUsername: string | null }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [pending, start] = useTransition();
  const [waiting, setWaiting] = useState(false);
  const linked = linkedAt !== null;
  const chatUrl = botUsername ? `https://t.me/${botUsername.replace(/^@/, "")}` : null;

  const connect = () =>
    start(async () => {
      const r = await createFitTelegramLink(Intl.DateTimeFormat().resolvedOptions().timeZone);
      if (!r.ok) {
        fitError(r.error, "Couldn't connect");
        return;
      }
      setWaiting(true);
      window.open(r.url!, "_blank", "noopener");
    });
  const disconnect = () =>
    start(async () => {
      const r = await disconnectFitTelegram();
      if (!r.ok) {
        fitError(r.error);
        return;
      }
      fitToast({ title: "Telegram unlinked", detail: "The bot can't log for you now", mood: "sleepy" });
      setWaiting(false);
      router.refresh();
    });

  return (
    <div className={`overflow-hidden rounded-2xl border bg-surface transition-colors duration-300 ${linked ? "border-outline" : "border-outline-variant"}`}>
      <div className="flex items-center gap-4 p-4 sm:p-5">
        <motion.span
          aria-hidden
          animate={linked && !reduce ? { rotate: [0, -12, 0] } : {}}
          transition={{ duration: 0.6, ease: EASE }}
          className={`relative grid size-12 shrink-0 place-items-center rounded-full shadow-[inset_0_0_0_4px_rgb(0_0_0/0.3)] ${linked ? "bg-primary text-primary-foreground" : "bg-steel text-background"}`}
        >
          {linked ? <Check className="size-5" strokeWidth={3} /> : <Send className="size-5" strokeWidth={2.5} />}
        </motion.span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-2xl leading-none font-bold uppercase">Telegram</span>
          <span className="mt-1 block font-mono text-xs text-ink-subtle">
            {linked ? `linked · ${new Date(linkedAt!).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "log by chat"}
          </span>
        </span>
        {linked ? (
          chatUrl && (
            <a
              href={chatUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:px-5"
            >
              <Send className="size-4" aria-hidden /> Open
            </a>
          )
        ) : waiting ? (
          <button
            type="button"
            onClick={() => router.refresh()}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-outline px-4 text-sm font-semibold text-ink transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:px-5"
          >
            <RefreshCw className="size-4" aria-hidden /> I tapped Start
          </button>
        ) : (
          <button
            type="button"
            disabled={pending || !botUsername}
            onClick={connect}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-40 sm:px-5"
          >
            {pending ? <PlateLoader size="sm" /> : <Send className="size-4" aria-hidden />}
            {botUsername ? "Connect" : "Not set up"}
          </button>
        )}
      </div>

      {/* What you can type: chips instead of a paragraph. */}
      <div className="flex flex-wrap items-center gap-1.5 border-t border-outline-variant px-4 py-3 sm:px-5" aria-label={`Messages the bot understands: ${EXAMPLES.join(", ")}`}>
        {EXAMPLES.map((e, i) => (
          <motion.code
            key={e}
            aria-hidden
            initial={reduce ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.06, ease: EASE }}
            className="rounded-full border border-outline-variant bg-background px-2.5 py-1 font-mono text-[11px] text-ink-variant"
          >
            {e}
          </motion.code>
        ))}
        <AnimatePresence>
          {linked && (
            <motion.button
              type="button"
              onClick={disconnect}
              disabled={pending}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-ink-subtle transition-colors hover:bg-hover hover:text-ink disabled:opacity-40"
            >
              <Unlink className="size-3.5" aria-hidden /> Unlink
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
