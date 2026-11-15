import Link from "next/link";
import type { ReactNode } from "react";

/** Every "log" entry point goes to the Log page, where the load-the-bar flow lives inline. */
export function OpenLogButton({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <Link href="/log" className={className}>
      {children}
    </Link>
  );
}
