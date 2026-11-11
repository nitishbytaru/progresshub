import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Lands Google OAuth: sign in from /login, or "Connect another Google account" from Profile. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  // `next` comes from the auth_next cookie (set before leaving), or a legacy ?next= param.
  const rawNext = searchParams.get("next") ?? decodeURIComponent(request.cookies.get("auth_next")?.value ?? "/");
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  const code = searchParams.get("code");
  let error: string | null = searchParams.get("error_description");
  if (!error && code) {
    const supabase = await createClient();
    error = (await supabase.auth.exchangeCodeForSession(code)).error?.message ?? null;
  } else if (!error) {
    error = "This sign-in link is missing its code. Try Continue with Google again.";
  }

  // A failed "Connect Google" from Profile returns there (the creator is still signed in), not to /login.
  const errorPage = next === "/profile" ? "/profile" : "/login";
  const res = NextResponse.redirect(error ? `${origin}${errorPage}?error=${encodeURIComponent(error)}` : `${origin}${next}`);
  res.cookies.delete("auth_next");
  return res;
}
