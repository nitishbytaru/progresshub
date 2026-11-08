"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Field, FormNotice, SubmitButton } from "@/components/auth/auth-shell";
import { createClient } from "@/lib/supabase/client";
import { GoogleLogo } from "@/components/auth/google-logo";
import { authenticate, type AuthState } from "../auth/actions";

type Mode = "signin" | "signup" | "reset";


const COPY: Record<Mode, { submit: string; pending: string }> = {
  signin: { submit: "Sign in", pending: "Signing in…" },
  signup: { submit: "Create account", pending: "Creating account…" },
  reset: { submit: "Send reset link", pending: "Sending…" },
};

export function AuthForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const linkError = params.get("error");
  const justDeleted = params.get("deleted") === "1";
  const [mode, setMode] = useState<Mode>(params.get("mode") === "signup" ? "signup" : "signin");
  const [googlePending, setGooglePending] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const [state, formAction, pending] = useActionState<AuthState, FormData>(authenticate, null);

  const google = async () => {
    setGooglePending(true);
    setGoogleError(null);
    document.cookie = `auth_next=${encodeURIComponent(next)}; path=/; max-age=600; samesite=lax`;
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      // Exact callback URL (no query) so it matches Supabase's Redirect URLs allow list; `next` rides in a cookie.
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setGooglePending(false);
      setGoogleError(error.message);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {mode !== "reset" && (
        <>
          <div role="tablist" aria-label="Account" className="grid grid-cols-2 gap-1 rounded-xl border border-border p-1">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                role="tab"
                type="button"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={
                  mode === m
                    ? "h-9 rounded-lg bg-foreground text-sm font-semibold text-background"
                    : "h-9 rounded-lg text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                }
              >
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={google}
            disabled={googlePending}
            className="inline-flex h-12 items-center justify-center gap-2.5 rounded-xl border border-border text-sm font-semibold transition-colors hover:bg-hover disabled:opacity-60"
          >
            <GoogleLogo />
            {googlePending ? "Opening Google…" : "Continue with Google"}
          </button>

          <div className="flex items-center gap-3 text-xs text-subtle">
            <span className="h-px flex-1 bg-hairline" /> or with email <span className="h-px flex-1 bg-hairline" />
          </div>
        </>
      )}

      {(linkError || googleError) && <FormNotice tone="error">{googleError ?? linkError}</FormNotice>}

      <form key={mode} action={formAction} noValidate className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="mode" value={mode} />
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state?.email}
          placeholder="you@example.com"
        />
        {mode !== "reset" && (
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
            minLength={mode === "signup" ? 8 : undefined}
            placeholder={mode === "signup" ? "8+ characters, with a letter and a number" : undefined}
            hint={
              mode === "signin" && (
                <button
                  type="button"
                  onClick={() => setMode("reset")}
                  className="-my-3 py-3 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Forgot password?
                </button>
              )
            }
          />
        )}

        {state?.error && <FormNotice tone="error">{state.error}</FormNotice>}
        {state?.message && <FormNotice tone="info">{state.message}</FormNotice>}
        {justDeleted && !state && (
          <FormNotice tone="info">Your account and all your data were deleted.</FormNotice>
        )}

        <SubmitButton pending={pending}>{pending ? COPY[mode].pending : COPY[mode].submit}</SubmitButton>
      </form>

      {mode === "reset" && (
        <button
          type="button"
          onClick={() => setMode("signin")}
          className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Back to sign in
        </button>
      )}
    </div>
  );
}
