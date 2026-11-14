"use client";

import type { ReactNode } from "react";

/** Opens the load-the-bar flow (the + LOG button listens for this event), so every "log" entry point is the same flow. */
export const OPEN_LOG_EVENT = "fit:open-log";

export function OpenLogButton({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(OPEN_LOG_EVENT))}>
      {children}
    </button>
  );
}
