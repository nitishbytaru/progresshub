import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL, hasSupabaseEnv } from "@/lib/supabase/env";

const PUBLIC_PATHS = ["/login", "/auth", "/welcome"];
const isPublic = (path: string) => PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

/**
 * Refreshes the Supabase session cookie on every request and gates the app:
 * signed out → /login, signed in without an X handle → /onboarding.
 */
export async function proxy(request: NextRequest) {
  if (!hasSupabaseEnv) {
    return new NextResponse(
      "progresshub: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local",
      { status: 500 },
    );
  }

  // Bot webhooks and reminder crons authenticate with their own secrets, not a session.
  if (/^\/api\/(telegram|whatsapp)(\/|$)/.test(request.nextUrl.pathname)) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Do not run code between createServerClient and getClaims: it refreshes the session.
  // Verifies the login token locally, so page loads don't wait on a call to Supabase Auth.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  const path = request.nextUrl.pathname;
  const redirectTo = (to: string, keepNext = false) => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    url.search = keepNext && path !== "/" ? `?next=${encodeURIComponent(path + request.nextUrl.search)}` : "";
    const res = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };

  // Creator pages, their share cards and robots.txt are public to everyone (and to X's crawler).
  if (path.startsWith("/u/") || path === "/robots.txt") return response;
  if (!claims && path === "/") {
    // Signed-out visitors get the landing page at the main address, with the URL unchanged.
    const url = request.nextUrl.clone();
    url.pathname = "/welcome";
    const res = NextResponse.rewrite(url);
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  }
  if (!claims) return isPublic(path) ? response : redirectTo("/login", true);
  if (path === "/welcome") return redirectTo("/");

  const onboarded = Boolean(claims.user_metadata?.handle);
  if (path === "/login") return redirectTo(onboarded ? "/" : "/onboarding");
  if (!onboarded && path !== "/onboarding" && !path.startsWith("/auth")) return redirectTo("/onboarding");
  if (onboarded && path === "/onboarding") return redirectTo("/");

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
