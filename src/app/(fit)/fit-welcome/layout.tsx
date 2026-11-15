import type { Metadata, Viewport } from "next";
import { Archivo, Barlow_Condensed } from "next/font/google";
import "../fit/fit.css";

const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });
const barlow = Barlow_Condensed({ variable: "--font-barlow", subsets: ["latin"], weight: ["500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: { default: "progresshub fit", template: "%s · progresshub fit" },
  description: "Log your body weight every day and watch the trend.",
};

export const viewport: Viewport = { themeColor: "#141414", colorScheme: "dark" };

/**
 * Signed-out root layout for fit.progresshub.space (served at / and /login via src/proxy.ts).
 * Its own document, so the app header, tabs and log button stay out of the landing page.
 */
export default function FitWelcomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${barlow.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
