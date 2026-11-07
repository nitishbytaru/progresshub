import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Lands every auth link: Google OAuth (`code`), email confirmation and password reset
 * (`code` with PKCE, or `token_hash` + `type` with custom email templates).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const rawNext = searchParams.get("next") ?? "/";
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

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error)}`);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
