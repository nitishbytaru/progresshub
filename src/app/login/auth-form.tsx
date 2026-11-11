"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { FormNotice } from "@/components/auth/auth-shell";
import { createClient } from "@/lib/supabase/client";
import { GoogleLogo } from "@/components/auth/google-logo";

/** Google is the only way in: every creator is a real, verified Google account. */
export function AuthForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const linkError = params.get("error");
  const justDeleted = params.get("deleted") === "1";
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const google = async () => {
    setPending(true);
    setError(null);
    document.cookie = `auth_next=${encodeURIComponent(next)}; path=/; max-age=600; samesite=lax`;
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      // Exact callback URL (no query) so it matches Supabase's Redirect URLs allow list; `next` rides in a cookie.
      options: { redirectTo: `${window.location.origin}/auth/callback`, queryParams: { prompt: "select_account" } },
    });
    if (error) {
      setPending(false);
      setError(error.message);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={google}
        disabled={pending}
        className="inline-flex h-12 items-center justify-center gap-2.5 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover active:bg-primary-pressed disabled:opacity-60"
      >
        <GoogleLogo />
        {pending ? "Opening Google…" : "Continue with Google"}
      </button>

      {(error || linkError) && <FormNotice tone="error">{error ?? linkError}</FormNotice>}
      {justDeleted && !error && !linkError && (
        <FormNotice tone="info">Your account and all your data were deleted.</FormNotice>
      )}

      <p className="text-center font-mono text-xs text-subtle">Used email before? Pick the same Gmail. Your logs stay.</p>
    </div>
  );
}
