import { NextResponse, type NextRequest } from "next/server";
import { requestOrigin } from "@/lib/origin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const FIT_URL = process.env.NEXT_PUBLIC_FIT_URL ?? "http://fit.localhost:3000";

/**
 * Profile → Fitness. The fit subdomain can't always read this site's login cookie
 * (never on localhost), so hand the session over with a one-time sign-in token
 * that fit.progresshub.space redeems at /auth/confirm. No email is sent.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${requestOrigin(request)}/login?next=/auth/fit`);
  if (!user.email) return NextResponse.redirect(`${FIT_URL}/login`);

  const { data, error } = await createAdminClient().auth.admin.generateLink({ type: "magiclink", email: user.email });
  const token = data?.properties?.hashed_token;
  if (error || !token) return NextResponse.redirect(`${FIT_URL}/login`);

  return NextResponse.redirect(`${FIT_URL}/auth/confirm?token_hash=${encodeURIComponent(token)}`);
}
