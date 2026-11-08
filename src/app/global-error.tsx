"use client";

import { useEffect } from "react";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { RotateCcw } from "lucide-react";
import { StatusScreen, statusAction } from "@/components/shell/status-screen";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], weight: ["400", "500", "600"] });

/** Last resort when the root layout itself fails. Replaces the whole document, so it brings its own fonts and styles. */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => console.error(error), [error]);
  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null;

  return (
    <html lang="en" className={`${jakarta.variable} ${jetbrains.variable} h-full antialiased`}>
      <body className="min-h-full">
        <title>Something went wrong · progresshub</title>
        <StatusScreen
          code="500"
          title="progresshub hit a snag"
          message="The app couldn't start this page. Your progress is safe. Reload to try again."
          detail={digest ? `ref ${digest}` : undefined}
          actions={
            <button type="button" onClick={() => retry()} className={statusAction.primary}>
              <RotateCcw className="size-4" /> Reload
            </button>
          }
        />
      </body>
    </html>
  );
}
