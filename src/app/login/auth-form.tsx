"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Field, FormNotice, SubmitButton } from "@/components/auth/auth-shell";
import { createClient } from "@/lib/supabase/client";
import { authenticate, type AuthState } from "../auth/actions";

type Mode = "signin" | "signup" | "reset";

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden>
      <path fill="#fff" d="M21.35 11.1H12v2.98h5.35c-.23 1.4-1.66 4.1-5.35 4.1-3.22 0-5.85-2.67-5.85-5.96S8.78 6.26 12 6.26c1.83 0 3.06.78 3.76 1.45l2.56-2.47C16.68 3.7 14.55 2.75 12 2.75 6.89 2.75 2.75 6.89 2.75 12S6.89 21.25 12 21.25c5.34 0 8.88-3.75 8.88-9.04 0-.6-.07-1.07-.15-1.53z" />
    </svg>
  );
}

const COPY: Record<Mode, { submit: string; pending: string }> = {
  signin: { submit: "Sign in", pending: "Signing in…" },
  signup: { submit: "Create account", pending: "Creating account…" },
  reset: { submit: "Send reset link", pending: "Sending…" },
};

export function AuthForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const linkError = params.get("error");
  const [mode, setMode] = useState<Mode>("signin");
  const [googlePending, setGooglePending] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const [state, formAction, pending] = useActionState<AuthState, FormData>(authenticate, null);

  const google = async () => {
    setGooglePending(true);
    setGoogleError(null);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
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

      <form key={mode} action={formAction} className="flex flex-col gap-4">
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
            placeholder={mode === "signup" ? "At least 8 characters" : undefined}
            hint={
              mode === "signin" && (
                <button
                  type="button"
                  onClick={() => setMode("reset")}
                  className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Forgot password?
                </button>
              )
            }
          />
        )}

        {state?.error && <FormNotice tone="error">{state.error}</FormNotice>}
        {state?.message && <FormNotice tone="info">{state.message}</FormNotice>}

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
