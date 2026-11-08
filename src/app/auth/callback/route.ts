import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Lands every auth link: Google OAuth (`code`), email confirmation and password reset
 * (`code` with PKCE, or `token_hash` + `type` with custom email templates).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  // `next` comes from the auth_next cookie (set before leaving), or a legacy ?next= param.
  const rawNext = searchParams.get("next") ?? decodeURIComponent(request.cookies.get("auth_next")?.value ?? "/");
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  const supabase = await createClient();
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  let error: string | null = searchParams.get("error_description");
  if (!error && code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code).then((r) => ({ error: r.error?.message ?? null })));
  } else if (!error && tokenHash && type) {
    ({ error } = await supabase.auth
      .verifyOtp({ type, token_hash: tokenHash })
      .then((r) => ({ error: r.error?.message ?? null })));
  } else if (!error) {
    error = "This sign-in link is missing its code.";
  }

  // A failed "Connect Google" from Profile returns there (the creator is still signed in), not to /login.
  const errorPage = next === "/profile" ? "/profile" : "/login";
  const res = error
    ? NextResponse.redirect(`${origin}${errorPage}?error=${encodeURIComponent(error)}`)
    : NextResponse.redirect(`${origin}${type === "recovery" ? "/auth/update-password" : next}`);
  res.cookies.delete("auth_next");
  return res;
}
