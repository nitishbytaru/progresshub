"use client";

import { useActionState, useId, useState } from "react";
import { AtSign, Check, Loader2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { updateHandle, type ProfileState } from "./actions";

type Props = { handle: string };

/** X username. The account email comes from Google, so it isn't editable here. */
export function ProfileForms({ handle }: Props) {
  return (
    <section aria-label="Account details" className="panel-dark flex flex-col divide-y divide-hairline rounded-2xl">
      <Field
        icon={AtSign}
        label="Username"
        name="handle"
        prefix="@"
        initial={handle}
        action={updateHandle}
        hint="Your X handle. It sets your public link, so old shared links stop working."
      />
    </section>
  );
}

function Field({
  icon: Icon,
  label,
  name,
  type = "text",
  prefix,
  initial,
  action,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  name: string;
  type?: string;
  prefix?: string;
  initial: string;
  action: (prev: ProfileState, formData: FormData) => Promise<ProfileState>;
  hint: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [value, setValue] = useState(initial);
  const id = useId();
  // `initial` refreshes after a save (the action revalidates the page), so this re-disables Save.
  const changed = value.trim().replace(/^@/, "").toLowerCase() !== initial.toLowerCase();

  return (
    <form action={formAction} className="p-5 sm:p-6">
      <label htmlFor={id} className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
        <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary-soft text-primary" aria-hidden>
          <Icon className="size-4" />
        </span>
        {label}
      </label>
      <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
        <div
          className={cn(
            "flex h-12 min-w-0 shrink-0 items-center rounded-xl sm:flex-1 border bg-surface-high px-4 transition-colors focus-within:border-foreground focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary",
            state?.error ? "border-foreground" : "border-hairline",
          )}
        >
          {prefix && <span className="mr-0.5 font-mono text-base text-subtle">{prefix}</span>}
          <input
            id={id}
            name={name}
            type={type}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoComplete={type === "email" ? "email" : "off"}
            autoCapitalize="off"
            spellCheck={false}
            maxLength={type === "email" ? 254 : 16}
            aria-invalid={Boolean(state?.error)}
            aria-describedby={`${id}-msg`}
            className="w-full min-w-0 bg-transparent font-mono text-base text-foreground caret-primary outline-none"
          />
        </div>
        {(changed || pending) && (
          <Button
            type="submit"
            disabled={pending}
            className="h-12 shrink-0 gap-2 bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover active:bg-primary-pressed"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" strokeWidth={2.5} />}
            {pending ? "Saving…" : "Save"}
          </Button>
        )}
      </div>
      <p
        id={`${id}-msg`}
        role={state?.error ? "alert" : "status"}
        className={cn("mt-2 min-h-5 text-sm", !state?.error && !state?.message && "hidden sm:block", state?.error ? "font-medium text-foreground" : state?.message ? "text-primary" : "text-muted-foreground")}
      >
        {state?.error ?? state?.message ?? hint}
      </p>
    </form>
  );
}
