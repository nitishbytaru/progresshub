"use client";

import { useActionState } from "react";
import { AuthShell, Field, FormNotice, SubmitButton } from "@/components/auth/auth-shell";
import { updatePassword, type AuthState } from "../actions";

export default function UpdatePasswordPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(updatePassword, null);
  return (
    <AuthShell title="Set a new password" subtitle="You're signed in from the reset link. Choose a new password.">
      <form action={action} className="flex flex-col gap-4">
        <Field
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          placeholder="At least 8 characters"
        />
        {state?.error && <FormNotice tone="error">{state.error}</FormNotice>}
        <SubmitButton pending={pending}>{pending ? "Saving…" : "Save password"}</SubmitButton>
      </form>
    </AuthShell>
  );
}
