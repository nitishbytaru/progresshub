"use client";

import { useRef, useState, useTransition } from "react";
import { ArrowUp, Sparkles } from "lucide-react";
import { askCoachAction } from "@/app/(fit)/fit/coach/actions";

const STARTERS = ["What should I eat after training today?", "How do I break my plateau?", "Is my protein enough?", "What should I train tomorrow?"];

/** Ask the coach: AI answers grounded in your own numbers (sent without your name or email). */
export function CoachChat() {
  const [q, setQ] = useState("");
  const [thread, setThread] = useState<{ q: string; a?: string; error?: string }[]>([]);
  const [pending, start] = useTransition();
  const end = useRef<HTMLDivElement>(null);

  const ask = (text: string) => {
    const question = text.trim();
    if (!question || pending) return;
    setQ("");
    setThread((t) => [...t, { q: question }]);
    start(async () => {
      const r = await askCoachAction(question);
      setThread((t) => t.map((m, i) => (i === t.length - 1 ? { ...m, a: r.answer, error: r.error } : m)));
      requestAnimationFrame(() => end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
    });
  };

  return (
    <section aria-label="Ask the coach" className="card-in flex flex-col gap-4 rounded-2xl border border-outline-variant bg-surface p-4 sm:p-6" style={{ ["--card-i" as string]: 3 }}>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-3xl font-bold uppercase">Ask coach</h2>
        {thread.length > 0 ? (
          <button type="button" onClick={() => setThread([])} disabled={pending} className="h-11 rounded-full px-3 text-sm font-semibold text-ink-subtle hover:bg-hover hover:text-ink">
            Clear
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink-subtle">
            <Sparkles className="size-3.5" aria-hidden /> AI · uses your numbers
          </span>
        )}
      </div>
      {thread.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {STARTERS.map((s, i) => (
            <button key={s} type="button" onClick={() => ask(s)} className={`min-h-11 rounded-full border border-outline px-3.5 py-2 text-left text-sm font-semibold text-ink-variant hover:bg-hover hover:text-ink ${i > 1 ? "hidden sm:inline-flex" : ""}`}>
              {s}
            </button>
          ))}
        </div>
      )}
      {thread.length > 0 && (
        <ol className="flex max-h-[420px] flex-col gap-4 overflow-y-auto pr-1" aria-live="polite">
          {thread.map((m, i) => (
            <li key={i} className="flex flex-col gap-2">
              <p className="self-end rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">{m.q}</p>
              {m.a ? (
                <p className="max-w-[60ch] rounded-2xl rounded-bl-sm border border-outline-variant bg-background px-4 py-3 text-sm leading-relaxed whitespace-pre-line text-ink">{m.a}</p>
              ) : m.error ? (
                <p className="text-sm text-ink-variant">{m.error}</p>
              ) : (
                <p className="text-sm text-ink-subtle">Coach is thinking…</p>
              )}
            </li>
          ))}
          <div ref={end} />
        </ol>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
        className="flex items-center gap-2 rounded-full border border-outline bg-background p-1.5 pl-4 focus-within:border-ink"
      >
        <input value={q} onChange={(e) => setQ(e.target.value.slice(0, 300))} placeholder="Ask about training or food…" aria-label="Your question" className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-ink-subtle" />
        <button type="submit" disabled={pending || !q.trim()} aria-label="Send" className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-40">
          <ArrowUp className="size-5" aria-hidden />
        </button>
      </form>
      <p className="text-xs text-ink-subtle">General guidance, not medical advice. Up to 30 questions a day.</p>
    </section>
  );
}
