import type { Metadata, Viewport } from "next";
import { Archivo, Barlow_Condensed } from "next/font/google";
import { SiteAnalytics } from "@/components/site-analytics";
import { TimezoneCookie } from "@/components/shell/timezone-cookie";
import { FitHeader } from "@/components/fit/fit-header";
import { BottomNav } from "@/components/fit/fit-nav";
import { FitToaster } from "@/components/fit/fit-toast";
import "./fit.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});
const barlow = Barlow_Condensed({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: { default: "progresshub fit", template: "%s · progresshub fit" },
  description: "Log your body weight every day and watch the trend.",
};

export const viewport: Viewport = {
  themeColor: "#141414",
  colorScheme: "dark",
};

/** Root layout for fit.progresshub.space: its own document and theme (Bumper Plates), nothing from Midnight Lime. */
export default function FitLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${barlow.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div className="mx-auto flex min-h-dvh w-full max-w-[640px] flex-col px-4 pb-28 sm:px-6 md:pb-12 md:max-w-[920px] md:px-8 lg:max-w-[1240px] lg:px-10">
          <FitHeader />
          <main className="flex flex-col">{children}</main>
        </div>
        <BottomNav />
        <FitToaster />
        <TimezoneCookie />
        <SiteAnalytics />
      </body>
    </html>
  );
}
