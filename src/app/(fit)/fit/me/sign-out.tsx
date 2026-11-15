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
      className="mt-6 flex border-t border-outline-variant pt-6"
    >
      <button
        type="submit"
        className="inline-flex h-12 items-center gap-2 rounded-full border border-outline px-6 text-base font-semibold text-ink-variant transition-colors hover:bg-hover hover:text-ink"
      >
        <LogOut className="size-4" aria-hidden />
        Log out
      </button>
    </form>
  );
}
