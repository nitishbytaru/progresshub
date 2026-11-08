import type { Metadata } from "next";
import Link from "next/link";
import { StatusScreen, statusAction } from "@/components/shell/status-screen";

export const metadata: Metadata = { title: "Page not found" };

/** Any URL that matches no route. */
export default function NotFound() {
  return (
    <StatusScreen
      code="404"
      title="This page went off the track"
      message="The link may be old or mistyped. Your progress is safe. Head back and keep logging."
      actions={
        <>
          <Link href="/" className={statusAction.primary}>
            Go to Overview
          </Link>
          <Link href="/leaderboard" className={statusAction.secondary}>
            See the leaderboard
          </Link>
        </>
      }
    />
  );
}
