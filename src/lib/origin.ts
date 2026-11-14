import type { NextRequest } from "next/server";

/**
 * The origin the visitor actually used (e.g. https://fit.progresshub.space).
 * `request.url` in route handlers can report the server's own host instead, which
 * would send fit visitors to the main app after sign-in.
 */
export function requestOrigin(request: NextRequest): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return request.nextUrl.origin;
  const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  return `${proto}://${host}`;
}
