import { NextResponse, type NextRequest } from "next/server";
import { requestOrigin } from "@/lib/origin";
import { createClient } from "@/lib/supabase/server";

/** Redeems the one-time token from /auth/fit and signs the viewer in on this host. */
export async function GET(request: NextRequest) {
  const origin = requestOrigin(request);
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  if (!tokenHash) return NextResponse.redirect(`${origin}/login`);

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash });
  const to = error ? `/login?error=${encodeURIComponent("That sign-in link expired. Continue with Google instead.")}` : "/";
  return NextResponse.redirect(`${origin}${to}`);
}
