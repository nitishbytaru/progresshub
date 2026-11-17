"use client";

import { LogOut } from "lucide-react";
import { signOut } from "@/app/(main)/auth/actions";
import { queueFitToast } from "@/components/fit/fit-toast";

/** Log out; the goodbye toast is queued so it shows on the page you land on. */
export function SignOutButton() {
  return (
    <form
      action={signOut}
      onSubmit={() =>
        queueFitToast({
          title: "Logged out",
          detail: "See you at the next session",
          mood: "sleepy",
        })
      }
      className="flex"
    >
      <button
        type="submit"
        className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-outline-variant bg-surface px-6 text-base font-semibold text-ink-variant transition-colors hover:bg-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <LogOut className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        Log out
      </button>
    </form>
  );
}
