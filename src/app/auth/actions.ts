"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { validateEmail, validateNewPassword } from "@/lib/validation";

export type AuthState = { error?: string; message?: string; email?: string } | null;

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return process.env.NEXT_PUBLIC_SITE_URL ?? `${proto}://${host}`;
}

/**
 * Where to land after an auth link. Kept in a cookie (not the callback URL) so the callback URL
 * exactly matches Supabase's Redirect URLs allow list.
 */
async function rememberNext(path: string) {
  (await cookies()).set("auth_next", path, { path: "/", maxAge: 60 * 60, sameSite: "lax", httpOnly: true });
}

/** Only allow same-site relative redirects. */
function safeNext(value: FormDataEntryValue | null, fallback = "/") {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : fallback;
}

function readCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  return { email, password };
}

const friendly = (msg: string) => {
  if (/invalid login credentials/i.test(msg)) return "That email and password don't match. Try again or reset your password.";
  if (/email not confirmed/i.test(msg)) return "Confirm your email first. Check your inbox for the link we sent.";
  if (/already registered/i.test(msg)) return "That email already has an account. Sign in instead.";
  if (/rate limit/i.test(msg)) return "Too many attempts. Wait a minute and try again.";
  if (/weak|pwned|leaked/i.test(msg)) return "That password is too easy to guess. Choose a stronger one.";
  if (/should be different/i.test(msg)) return "Choose a password different from your current one.";
  return msg;
};

export async function signIn(_: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  const emailError = validateEmail(email);
  if (emailError) return { error: emailError, email };
  if (!password) return { error: "Enter your password.", email };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: friendly(error.message), email };
  redirect(safeNext(formData.get("next")));
}

export async function signUp(_: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  const problem = validateEmail(email) ?? validateNewPassword(password);
  if (problem) return { error: problem, email };
  const supabase = await createClient();
  await rememberNext("/onboarding");
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${await origin()}/auth/callback` },
  });
  if (error) return { error: friendly(error.message), email };
  if (!data.session) {
    return { message: `We sent a confirmation link to ${email}. Open it to finish creating your account.`, email };
  }
  redirect("/onboarding");
}

export async function requestPasswordReset(_: AuthState, formData: FormData): Promise<AuthState> {
  const { email } = readCredentials(formData);
  if (!email) return { error: "Enter the email you signed up with.", email };
  const emailError = validateEmail(email);
  if (emailError) return { error: emailError, email };
  const supabase = await createClient();
  await rememberNext("/auth/update-password");
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await origin()}/auth/callback`,
  });
  if (error) return { error: friendly(error.message), email };
  return { message: `If ${email} has an account, a reset link is on its way.`, email };
}

export async function updatePassword(_: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  const problem = validateNewPassword(password);
  if (problem) return { error: problem };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: friendly(error.message) };
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/** Single entry point for the login form so `useActionState` keeps one stable action. */
export async function authenticate(prev: AuthState, formData: FormData): Promise<AuthState> {
  const mode = formData.get("mode");
  if (mode === "signup") return signUp(prev, formData);
  if (mode === "reset") return requestPasswordReset(prev, formData);
  return signIn(prev, formData);
}
