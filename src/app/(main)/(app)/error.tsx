"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { StatusScreen, statusAction } from "@/components/shell/status-screen";

/** Errors inside the app: keeps the sidebar and bottom nav so the creator can move on. */
export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => console.error(error), [error]);
  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null;

  return (
    <StatusScreen
      variant="inline"
      code="500"
      title="This page didn't load"
      message="Something went wrong fetching your numbers. Your logs are safe. Try again, or open another page."
      detail={digest ? `ref ${digest}` : undefined}
      actions={
        <>
          <button type="button" onClick={() => retry()} className={statusAction.primary}>
            <RotateCcw className="size-4" /> Try again
          </button>
          <Link href="/progress" className={statusAction.secondary}>
            Log today
          </Link>
        </>
      }
    />
  );
}
