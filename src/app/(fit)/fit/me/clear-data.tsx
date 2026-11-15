"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";
import { FIT_CLEAR_CONFIRM_WORD } from "@/lib/validation";
import { clearFitData, type ClearState } from "./actions";

/** Wipes fit logs only (weigh-ins, sets, food, water/sleep/steps, custom foods). Profile and X progress stay. */
export function ClearFitData() {
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState("");
  const [state, action, pending] = useActionState<ClearState, FormData>(clearFitData, null);

  if (state?.cleared) {
    return <p role="status" className="text-sm text-ink-variant">Fit data cleared. Your profile and progresshub stats are untouched.</p>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-12 items-center gap-2 rounded-full border border-destructive/60 px-6 text-base font-semibold text-ink-variant transition-colors hover:bg-destructive/10 hover:text-ink"
      >
        <Trash2 className="size-4" aria-hidden />
        Clear fit data
      </button>
    );
  }

  return (
    <form
      action={action}
      className="flex w-full max-w-md flex-col gap-3 rounded-2xl border border-destructive/60 bg-surface p-4 sm:p-5"
    >
      <p className="font-display text-2xl font-bold uppercase">Clear all fit data?</p>
      <p className="text-sm text-ink-variant">
        Deletes every weigh-in, set, meal, water/sleep/steps entry and custom food. Your fit profile and your progresshub X data stay. This can&apos;t be undone.
      </p>
      <label className="flex flex-col gap-1.5 text-sm text-ink-variant">
        Type <span className="font-mono text-ink">{FIT_CLEAR_CONFIRM_WORD}</span> to confirm
        <input
          name="confirm"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          autoComplete="off"
          autoFocus
          className="h-12 rounded-xl border border-outline bg-background px-3 text-base text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>
      {state?.error && (
        <p role="alert" className="text-sm text-ink">
          {state.error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending || word.trim().toLowerCase() !== FIT_CLEAR_CONFIRM_WORD}
          className="inline-flex h-12 items-center gap-2 rounded-full bg-destructive px-6 text-base font-bold text-destructive-foreground transition-opacity disabled:opacity-40"
        >
          <Trash2 className="size-4" aria-hidden />
          {pending ? "Clearing…" : "Clear fit data"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setWord("");
          }}
          className="inline-flex h-12 items-center rounded-full border border-outline px-6 text-base font-semibold text-ink-variant transition-colors hover:bg-hover hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
