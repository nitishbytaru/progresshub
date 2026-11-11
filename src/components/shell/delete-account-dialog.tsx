"use client";

import { useActionState, useId, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { deleteAccount } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { fmt } from "@/lib/format";
import { DELETE_CONFIRM_WORD } from "@/lib/validation";

type Props = {
  /** Element that opens the dialog, and what it shows. */
  trigger: React.ReactElement;
  triggerLabel: React.ReactNode;
  handle: string | null;
  logCount: number;
};

/** Permanently deletes the account after the creator types the confirm word. */
export function DeleteAccountDialog({ trigger, triggerLabel, handle, logCount }: Props) {
  const [state, action, pending] = useActionState(deleteAccount, null);
  const [typed, setTyped] = useState("");
  const inputId = useId();
  const ready = typed.trim().toLowerCase() === DELETE_CONFIRM_WORD;

  const erased = [
    `${fmt(logCount)} daily ${logCount === 1 ? "log" : "logs"}`,
    handle ? `Your profile and public page (@${handle})` : "Your profile",
    "Your spot on the leaderboard",
    "Your Google sign-in",
  ];

  return (
    <Dialog onOpenChange={(open) => !open && setTyped("")}>
      <DialogTrigger render={trigger}>{triggerLabel}</DialogTrigger>
      <DialogContent className="panel-dark gap-0 rounded-2xl p-0 ring-0 sm:max-w-[440px] [&>[data-slot=dialog-close]]:top-4 [&>[data-slot=dialog-close]]:right-4">
        <form action={action}>
          <div className="border-b border-hairline px-5 py-4 pr-14 sm:px-6">
            <DialogTitle className="text-lg font-bold tracking-[-0.015em] text-foreground">Delete your account</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              This erases everything below from progresshub. It can&apos;t be undone.
            </DialogDescription>
          </div>

          <div className="p-5 sm:p-6">
            <ul className="flex flex-col divide-y divide-hairline rounded-xl border border-hairline">
              {erased.map((item) => (
                <li key={item} className="flex items-center gap-3 px-4 py-3 text-sm text-foreground">
                  <Trash2 className="size-4 shrink-0 text-danger-hover" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-subtle">Posts you already shared on X stay on X.</p>

            <label htmlFor={inputId} className="mt-6 block text-sm font-semibold text-foreground">
              Type <span className="font-mono text-primary">{DELETE_CONFIRM_WORD}</span> to confirm
            </label>
            <input
              id={inputId}
              name="confirm"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              aria-invalid={Boolean(state?.error)}
              aria-describedby={`${inputId}-msg`}
              className="mt-2.5 h-12 w-full rounded-xl border border-hairline bg-surface-high px-4 font-mono text-base text-foreground caret-primary outline-none transition-colors focus:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            />
            <p id={`${inputId}-msg`} role="alert" className="mt-2 min-h-5 text-sm font-medium text-foreground">
              {state?.error}
            </p>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-hairline px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <DialogClose
              render={
                <Button type="button" variant="ghost" className="h-11 px-5 text-sm font-semibold text-foreground hover:bg-hover" />
              }
            >
              Cancel
            </DialogClose>
            <Button
              type="submit"
              disabled={!ready || pending}
              className="h-11 gap-2 bg-danger px-5 text-sm font-semibold text-white hover:bg-danger-hover disabled:opacity-40"
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              {pending ? "Deleting…" : "Delete account"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
