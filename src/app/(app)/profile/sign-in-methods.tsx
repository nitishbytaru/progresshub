"use client";

import { useActionState, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, KeyRound, Loader2, Plus, ShieldCheck } from "lucide-react";
import { GoogleLogo } from "@/components/auth/google-logo";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { setPassword, type PasswordState } from "./sign-in-actions";

export type Login = { id: string; provider: string; email: string | null };

type Props = {
  logins: Login[];
  hasPassword: boolean;
  accountEmail: string;
  /** Error text from a failed Google connect, passed back by /auth/callback. */
  linkError?: string | null;
};

/** Supabase's linking errors in plain words. */
function friendlyLinkError(raw: string) {
  if (/already|exists|linked/i.test(raw)) return "That Google account already belongs to another progresshub account.";
  if (/manual linking/i.test(raw)) return "Connecting another account isn't switched on yet. Ask the site owner to enable manual linking in Supabase.";
  return "Couldn't connect that Google account. Try again.";
}

/**
 * How this account can sign in: each connected Google account, plus email + password.
 * Disconnecting is offered only while another way in remains, so nobody locks themselves out.
 */
export function SignInMethods({ logins, hasPassword, accountEmail, linkError }: Props) {
  const router = useRouter();
  const google = logins.filter((l) => l.provider === "google");
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(linkError ? friendlyLinkError(linkError) : null);
  const [showPassword, setShowPassword] = useState(false);
  // Supabase only unlinks while 2+ identities exist; a password alone isn't an identity.
  const canDisconnect = logins.length >= 2;

  const connectGoogle = async () => {
    setBusy("connect");
    setProblem(null);
    document.cookie = `auth_next=${encodeURIComponent("/profile")}; path=/; max-age=600; samesite=lax`;
    const { error } = await createClient().auth.linkIdentity({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback`, queryParams: { prompt: "select_account" } },
    });
    if (error) {
      setBusy(null);
      setProblem(
        error.code === "manual_linking_disabled"
          ? "Connecting another account isn't switched on yet. Ask the site owner to enable manual linking in Supabase."
          : "Couldn't start connecting Google. Try again.",
      );
    }
  };

  const disconnect = async (id: string) => {
    setBusy(id);
    setProblem(null);
    const supabase = createClient();
    const { data, error: listError } = await supabase.auth.getUserIdentities();
    const identity = data?.identities.find((i) => i.identity_id === id);
    const { error } = identity ? await supabase.auth.unlinkIdentity(identity) : { error: listError ?? new Error("missing") };
    setBusy(null);
    if (error) {
      setProblem("Couldn't disconnect that account. You need at least one other way to sign in.");
      return;
    }
    router.refresh();
  };

  return (
    <section aria-labelledby="signin-title" className="panel-dark rounded-2xl">
      <div className="flex items-center gap-2.5 px-5 pt-5 sm:px-6 sm:pt-6">
        <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary-soft text-primary" aria-hidden>
          <ShieldCheck className="size-4" />
        </span>
        <h2 id="signin-title" className="text-sm font-semibold">
          Sign-in methods
        </h2>
      </div>

      <ul className="mt-4 divide-y divide-hairline border-t border-hairline">
        {google.map((g) => (
          <li key={g.id} className="flex items-center gap-3 px-5 py-3.5 sm:px-6">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-hairline text-foreground">
              <GoogleLogo className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Google</span>
              <span className="block truncate font-mono text-xs text-muted-foreground">{g.email ?? "connected"}</span>
            </span>
            {canDisconnect ? (
              <Button
                variant="ghost"
                onClick={() => disconnect(g.id)}
                disabled={busy !== null}
                className="h-9 px-3 text-xs font-semibold text-muted-foreground hover:bg-hover hover:text-foreground"
              >
                {busy === g.id ? <Loader2 className="size-3.5 animate-spin" /> : "Disconnect"}
              </Button>
            ) : (
              <Tag on>connected</Tag>
            )}
          </li>
        ))}

        <li className="px-5 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-hairline text-foreground">
              <KeyRound className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Email & password</span>
              <span className="block truncate font-mono text-xs text-muted-foreground">
                {hasPassword ? accountEmail : "no password yet"}
              </span>
            </span>
            {!showPassword && (
              <Button
                variant="outline"
                onClick={() => setShowPassword(true)}
                className="h-9 border-border bg-transparent px-3 text-xs font-semibold text-foreground hover:bg-hover"
              >
                {hasPassword ? "Change" : "Set password"}
              </Button>
            )}
          </div>
          {showPassword && <PasswordForm onDone={() => setShowPassword(false)} />}
        </li>
      </ul>

      <div className="flex flex-col gap-2 border-t border-hairline px-5 py-4 sm:px-6">
        <Button
          variant="outline"
          onClick={connectGoogle}
          disabled={busy !== null}
          className="h-10 w-full gap-2 border-border bg-transparent text-sm font-semibold text-foreground hover:bg-hover sm:w-auto sm:self-start"
        >
          {busy === "connect" ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          {google.length ? (
            <>
              <span className="sm:hidden">Add Google account</span>
              <span className="hidden sm:inline">Connect another Google account</span>
            </>
          ) : (
            "Connect Google"
          )}
        </Button>
        {problem && (
          <p role="alert" className="text-sm font-medium text-foreground">
            {problem}
          </p>
        )}
      </div>
    </section>
  );
}

function Tag({ on, children }: { on?: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[11px]",
        on ? "border-primary/40 text-primary" : "border-hairline text-subtle",
      )}
    >
      {on && <Check className="size-3" strokeWidth={3} aria-hidden />}
      {children}
    </span>
  );
}

function PasswordForm({ onDone }: { onDone: () => void }) {
  const [state, action, pending] = useActionState<PasswordState, FormData>(setPassword, null);
  const id = useId();
  return (
    <form action={action} className="mt-3 flex flex-col gap-2 pl-12">
      <label htmlFor={id} className="sr-only">
        New password
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={id}
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="New password"
          aria-invalid={Boolean(state?.error)}
          aria-describedby={`${id}-msg`}
          className="h-11 min-w-0 flex-1 rounded-xl border border-hairline bg-surface-high px-4 text-base text-foreground caret-primary sm:text-sm outline-none focus:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        />
        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={pending}
            className="h-11 flex-1 gap-2 bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover sm:flex-none"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" strokeWidth={2.5} />}
            Save
          </Button>
          <Button type="button" variant="ghost" onClick={onDone} className="h-11 px-3 text-sm text-muted-foreground hover:bg-hover">
            Cancel
          </Button>
        </div>
      </div>
      <p
        id={`${id}-msg`}
        role={state?.error ? "alert" : "status"}
        className={cn("min-h-5 text-xs", state?.error ? "font-medium text-foreground" : state?.message ? "text-primary" : "text-subtle")}
      >
        {state?.error ?? state?.message ?? "At least 8 characters, with a letter and a number."}
      </p>
    </form>
  );
}
