"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { GoogleLogo } from "@/components/auth/google-logo";
import { createClient } from "@/lib/supabase/client";

/** Google sign-in for fit. Same account as progresshub; lands on /auth/callback on this host. */
export function FitSignIn() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const linkError = params.get("error");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const google = async () => {
    setPending(true);
    setError(null);
    document.cookie = `auth_next=${encodeURIComponent(next)}; path=/; max-age=600; samesite=lax`;
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback`, queryParams: { prompt: "select_account" } },
    });
    if (error) {
      setPending(false);
      setError(error.message);
    }
  };

  return (
    <div className="flex max-w-sm flex-col gap-3">
      <button
        type="button"
        onClick={google}
        disabled={pending}
        className="inline-flex h-12 items-center justify-center gap-2.5 rounded-full bg-primary px-6 text-base font-bold text-primary-foreground transition-colors hover:bg-primary-hover active:bg-primary-pressed disabled:opacity-60"
      >
        <GoogleLogo />
        {pending ? "Opening Google…" : "Continue with Google"}
      </button>
      {(error || linkError) && (
        <p role="alert" className="text-sm text-ink-variant">
          {error ?? linkError}
        </p>
      )}
    </div>
  );
}
