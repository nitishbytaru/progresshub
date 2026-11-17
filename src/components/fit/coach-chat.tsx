"use client";

import { useEffect, useRef, useState, useTransition, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { ArrowUp, Check, RotateCcw, Sparkles, X } from "lucide-react";
import { applyCoachChange, chatCoach, clearCoachChat, discardCoachChange, undoCoachChange } from "@/app/(fit)/fit/coach/actions";
import type { ChatTurn, Proposal } from "@/lib/fit-coach-chat";
import { WEEKDAYS, musclesText, type CoachDay } from "@/lib/fit-coach-plan";
import { mealLabel } from "@/lib/fit-foods";
import { PLATE } from "@/lib/fit-units";
import { Dumbo } from "./dumbo";
import { fitError, fitToast } from "./fit-toast";
import { PlateLoader } from "./plate-loader";

const EASE = [0.2, 0.9, 0.25, 1] as const;
const weekdayOf = (day: string) => WEEKDAYS[(new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7];
const signed = (v: number) => `${v > 0 ? "▲" : "▼"}${Math.abs(Math.round(v))}`;

function Plates({ d }: { d: CoachDay }) {
  if (d.rest || !d.muscles.length) return <span className="text-ink-subtle">Rest</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      {d.muscles.map((m) => (
        <span key={m} className="size-2.5 rounded-full" style={{ background: PLATE[m].fill }} aria-hidden />
      ))}
      <span>{musclesText(d.muscles)}</span>
    </span>
  );
}

/** What an edit changes: old struck through, new highlighted. */
function ProposalView({ p }: { p: Proposal }) {
  return (
    <div className="flex flex-col gap-3">
      {p.week && (
        <div className="flex flex-col gap-1.5">
          <p className="font-mono text-[11px] text-ink-subtle">training week</p>
          {p.week.changed.map((day) => {
            const now = p.week!.days.find((d) => d.day === day)!;
            const was = p.week!.before.find((d) => d.day === day);
            return (
              <div key={day} className="grid grid-cols-[38px_1fr] items-center gap-2 text-sm">
                <span className="font-display text-base font-bold uppercase">{weekdayOf(day)}</span>
                <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                  {was && (
                    <span className="text-ink-subtle line-through decoration-1">
                      {was.rest || !was.muscles.length ? "Rest" : musclesText(was.muscles)}
                    </span>
                  )}
                  <span className="text-ink-subtle" aria-hidden>→</span>
                  <span className="font-semibold">
                    <Plates d={now} />
                  </span>
                </span>
              </div>
            );
          })}
          {p.week.notes.map((n) => (
            <p key={n} className="text-xs text-ink-variant">⚠ {n}</p>
          ))}
        </div>
      )}
      {p.meals && (
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[11px] text-ink-subtle">meal prep</p>
          {p.meals.changed.map((meal) => {
            const now = p.meals!.meals.find((m) => m.meal === meal)!;
            const was = p.meals!.before.find((m) => m.meal === meal);
            const dk = was ? now.kcal - was.kcal : 0;
            const dp = was ? now.protein - was.protein : 0;
            return (
              <div key={meal} className="flex flex-col gap-0.5 text-sm">
                <span className="text-xs font-bold tracking-wide text-ink-subtle uppercase">{mealLabel(meal)}</span>
                {was && <span className="text-ink-subtle line-through decoration-1">{was.dish}</span>}
                <span className="font-semibold">{now.dish}</span>
                <span className="flex flex-wrap gap-1.5 font-mono text-[11px] text-ink-variant">
                  <span className="rounded-full border border-outline-variant px-2 py-0.5">
                    {Math.round(now.kcal)} kcal{was && Math.abs(dk) >= 1 ? ` ${signed(dk)}` : ""}
                  </span>
                  <span className="rounded-full border border-outline-variant px-2 py-0.5">
                    {Math.round(now.protein)} g protein{was && Math.abs(dp) >= 1 ? ` ${signed(dp)}` : ""}
                  </span>
                </span>
              </div>
            );
          })}
          {p.meals.warnings.slice(0, 2).map((w) => (
            <p key={w.text} className="text-xs text-ink-variant">⚠ {w.text}</p>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Talk to Coach Dumbo about the plan he made. He knows this week's training and today's meal prep;
 * when you ask for a change he shows it as a preview. Nothing changes until you tap Apply (Undo after).
 */
export function CoachChat({ turns: initial, hasPlan, hasPrep, aiLeft }: { turns: ChatTurn[]; hasPlan: boolean; hasPrep: boolean; aiLeft: number }) {
  const router = useRouter();
  const [turns, setTurns] = useState(initial);
  const [draft, setDraft] = useState("");
  const [waiting, setWaiting] = useState<string | null>(null);
  const [left, setLeft] = useState(aiLeft);
  const [pending, start] = useTransition();
  const [busyIdx, setBusyIdx] = useState<number | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [turns.length, waiting]);

  const starters = [
    ...(hasPlan ? ["Move today's session to tomorrow", "I can only train 3 more days", "Swap legs for back"] : ["Plan my week around 4 gym days"]),
    ...(hasPrep ? ["Swap dinner for something lighter", "More protein at lunch"] : []),
  ];

  const send = (text: string) => {
    const t = text.trim();
    if (!t || pending) return;
    setDraft("");
    setWaiting(t);
    start(async () => {
      const r = await chatCoach(t);
      setWaiting(null);
      if (r.error) {
        fitError(r.error, "Dumbo didn't answer");
        setDraft(t);
        return;
      }
      setLeft((n) => Math.max(0, n - 1));
      setTurns(r.turns ?? []);
    });
  };

  const act = (i: number, fn: (i: number) => Promise<{ error?: string; turns?: ChatTurn[] }>, done?: string) => {
    setBusyIdx(i);
    start(async () => {
      const r = await fn(i);
      setBusyIdx(null);
      if (r.error) return void fitError(r.error);
      setTurns(r.turns ?? turns);
      if (done) fitToast({ title: done, detail: "Coach Dumbo updated your plan", mood: "proud" });
      router.refresh();
    });
  };

  const clear = () =>
    start(async () => {
      const r = await clearCoachChat();
      if (r.error) return void fitError(r.error);
      setTurns([]);
    });

  return (
    <MotionConfig reducedMotion="user">
      <section aria-label="Talk to Coach Dumbo" className="card-in flex flex-col gap-4 rounded-3xl border border-outline-variant bg-surface p-4 sm:p-6" style={{ "--card-i": 1 } as CSSProperties}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-3xl leading-none font-bold uppercase">Talk to Dumbo</h2>
            <span className="font-mono text-[11px] text-ink-subtle">knows your week + meals · {left} left today</span>
          </div>
          {turns.length > 0 && (
            <button type="button" onClick={clear} disabled={pending} className="h-10 rounded-full px-3 text-sm font-semibold text-ink-subtle transition-colors hover:bg-hover hover:text-ink disabled:opacity-40">
              Clear
            </button>
          )}
        </div>

        <div ref={scroller} className="flex max-h-[460px] flex-col gap-3 overflow-y-auto pr-1" aria-live="polite">
          {turns.length === 0 && !waiting && (
            <div className="flex items-center gap-3 py-2">
              <Dumbo mood="curious" outfit="coach" size={56} />
              <p className="text-sm text-ink-variant">Want to change something in the plan? Tell me what and I&apos;ll show you before anything changes.</p>
            </div>
          )}

          <AnimatePresence initial={false}>
            {turns.map((t, i) =>
              t.role === "user" ? (
                <motion.div
                  key={`${i}-${t.at}`}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, ease: EASE }}
                  className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
                >
                  {t.text}
                </motion.div>
              ) : (
                <motion.div
                  key={`${i}-${t.at}`}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className="flex max-w-[92%] items-end gap-2"
                >
                  <span className="shrink-0">
                    <Dumbo mood={t.mood} outfit="coach" size={40} />
                  </span>
                  <div className="flex min-w-0 flex-col gap-3 rounded-2xl rounded-bl-md border border-outline-variant bg-background px-4 py-3">
                    <p className="text-sm leading-relaxed">{t.text}</p>
                    {t.proposal && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        transition={{ duration: 0.35, ease: EASE }}
                        className={`flex flex-col gap-3 overflow-hidden rounded-xl border p-3 ${t.status === "pending" ? "border-outline" : "border-outline-variant opacity-80"}`}
                      >
                        <ProposalView p={t.proposal} />
                        <div className="flex flex-wrap items-center gap-2">
                          {t.status === "pending" && (
                            <>
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => act(i, applyCoachChange, "Plan updated")}
                                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
                              >
                                {busyIdx === i ? <PlateLoader size="sm" /> : <Check className="size-4" aria-hidden />} Apply
                              </button>
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => act(i, discardCoachChange)}
                                className="inline-flex h-10 items-center gap-1.5 rounded-full border border-outline px-4 text-sm font-semibold text-ink-variant transition-colors hover:bg-hover hover:text-ink disabled:opacity-50"
                              >
                                <X className="size-4" aria-hidden /> Discard
                              </button>
                            </>
                          )}
                          {t.status === "applied" && (
                            <>
                              <span className="inline-flex items-center gap-1 font-mono text-xs text-ink">
                                <Check className="size-3.5" aria-hidden /> applied
                              </span>
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => act(i, undoCoachChange, "Change undone")}
                                className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-ink-subtle transition-colors hover:bg-hover hover:text-ink disabled:opacity-50"
                              >
                                {busyIdx === i ? <PlateLoader size="sm" /> : <RotateCcw className="size-3.5" aria-hidden />} Undo
                              </button>
                            </>
                          )}
                          {(t.status === "discarded" || t.status === "undone") && <span className="font-mono text-xs text-ink-subtle">{t.status}</span>}
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              ),
            )}
          </AnimatePresence>

          {waiting && (
            <>
              <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground opacity-80">{waiting}</div>
              <div className="flex items-end gap-2">
                <Dumbo mood="thinking" outfit="coach" size={40} />
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-outline-variant bg-background px-4 py-3" aria-label="Dumbo is thinking">
                  {[0, 1, 2].map((k) => (
                    <motion.span key={k} className="size-1.5 rounded-full bg-ink-variant" animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }} transition={{ duration: 0.9, repeat: Infinity, delay: k * 0.15 }} />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {turns.length === 0 && !waiting && (
          <div className="flex flex-wrap gap-2">
            {starters.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                disabled={pending}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-outline-variant px-3 text-xs font-semibold text-ink-variant transition-colors hover:bg-hover hover:text-ink disabled:opacity-50"
              >
                <Sparkles className="size-3.5" aria-hidden /> {s}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
          className="flex items-center gap-2 rounded-full border border-outline bg-background py-1.5 pr-1.5 pl-4 focus-within:border-ink"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 300))}
            placeholder={hasPlan || hasPrep ? "e.g. move legs to Thursday, no paneer tonight" : "Ask Dumbo about your training or meals"}
            aria-label="Message Coach Dumbo"
            className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-ink-subtle sm:text-sm"
          />
          <button
            type="submit"
            disabled={pending || !draft.trim() || left <= 0}
            aria-label="Send"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-40"
          >
            {waiting ? <PlateLoader size="sm" /> : <ArrowUp className="size-4" strokeWidth={2.5} aria-hidden />}
          </button>
        </form>
      </section>
    </MotionConfig>
  );
}
