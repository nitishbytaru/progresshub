import { NextResponse, type NextRequest } from "next/server";
import { finishScoreClaim } from "@/lib/pending-score";

/** Where Google and email-link sign-ins land to add the landing page's score check. */
export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL(await finishScoreClaim(), request.nextUrl.origin));
}
