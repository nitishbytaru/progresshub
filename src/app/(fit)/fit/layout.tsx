import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { SiteAnalytics } from "@/components/site-analytics";
import { TimezoneCookie } from "@/components/shell/timezone-cookie";
import { FitHeader } from "@/components/fit/fit-header";
import "./fit.css";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: { default: "progresshub fit", template: "%s · progresshub fit" },
  description: "Log your body weight every day and watch the trend.",
};

export const viewport: Viewport = {
  themeColor: "#0e0d10",
  colorScheme: "dark",
};

/** Root layout for fit.progresshub.space: its own document and theme (Carbon Ice), nothing from Midnight Lime. */
export default function FitLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${jetbrains.variable} h-full antialiased`}>
      <body className="min-h-full">
        <div className="mx-auto flex min-h-dvh w-full max-w-[640px] flex-col px-4 pb-12 sm:px-6">
          <FitHeader />
          <main className="flex flex-col">{children}</main>
        </div>
        <TimezoneCookie />
        <SiteAnalytics />
      </body>
    </html>
  );
}
