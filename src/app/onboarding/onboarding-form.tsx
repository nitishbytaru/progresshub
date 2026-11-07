"use client";

import { useActionState } from "react";
import { Field, FormNotice, SubmitButton } from "@/components/auth/auth-shell";
import { completeOnboarding, type OnboardingState } from "./actions";

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(completeOnboarding, null);
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <Field
        label="X handle"
        name="handle"
        required
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={16}
        placeholder="@yourhandle"
        defaultValue={state?.handle}
      />
      <Field
        label="Display name"
        name="name"
        required
        maxLength={50}
        autoComplete="name"
        defaultValue={state?.name ?? defaultName}
      />
      <p className="text-xs text-subtle">
        Your handle, name and progress appear on the public leaderboard.
      </p>
      {state?.error && <FormNotice tone="error">{state.error}</FormNotice>}
      <SubmitButton pending={pending}>{pending ? "Saving…" : "Start tracking"}</SubmitButton>
    </form>
  );
}
