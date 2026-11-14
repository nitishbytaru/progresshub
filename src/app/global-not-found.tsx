import type { Metadata } from "next";
import Link from "next/link";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { StatusScreen, statusAction } from "@/components/shell/status-screen";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = { title: "Page not found · progresshub" };

/** Any URL that matches no route. The app has two root layouts, so this page brings its own document. */
export default function GlobalNotFound() {
  return (
    <html lang="en" className={`${jakarta.variable} ${jetbrains.variable} h-full antialiased`}>
      <body className="min-h-full">
        <StatusScreen
          code="404"
          title="This page went off the track"
          message="That link is old or mistyped. Your progress is safe."
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
      </body>
    </html>
  );
}
