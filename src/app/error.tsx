"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { StatusScreen, statusAction } from "@/components/shell/status-screen";

/** Errors outside the app shell: login, onboarding, public creator pages. */
export default function RouteError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => console.error(error), [error]);
  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null;

  return (
    <StatusScreen
      code="500"
      title="Something broke on our side"
      message="This page hit an error while loading. Nothing you entered was lost. Try again in a moment."
      detail={digest ? `ref ${digest}` : undefined}
      actions={
        <>
          <button type="button" onClick={() => retry()} className={statusAction.primary}>
            <RotateCcw className="size-4" /> Try again
          </button>
          <Link href="/" className={statusAction.secondary}>
            Go home
          </Link>
        </>
      }
    />
  );
}
