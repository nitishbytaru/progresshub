"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

/** Link to /login that carries the landing page's ?next= along. Wrap in <Suspense> (reads search params). */
export function LoginLink({ className, children }: { className: string; children: React.ReactNode }) {
  const next = useSearchParams().get("next");
  return (
    <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className={className}>
      {children}
    </Link>
  );
}
