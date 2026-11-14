"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Apple, ChartNoAxesColumn, Dumbbell, ScanLine, SquarePen } from "lucide-react";

/** On fit.progresshub.space "/x" is rewritten to /fit/x, so match both spellings. */
const at = (path: string, href: string) => {
  const p = path.replace(/^\/fit(?=\/|$)/, "") || "/";
  return href === "/" ? p === "/" : p === href || p.startsWith(`${href}/`);
};

export const FIT_TABS = [
  { href: "/", label: "Home", icon: ChartNoAxesColumn },
  { href: "/log", label: "Log", icon: SquarePen },
  { href: "/food", label: "Food", icon: Apple },
  { href: "/coach", label: "Coach", icon: Dumbbell },
  { href: "/insights", label: "Insights", icon: ScanLine },
] as const;

/** md+: pill tabs in the header. */
export function FitNav() {
  const path = usePathname();
  return (
    <nav aria-label="Fitness" className="hidden rounded-full border border-outline p-1 md:flex">
      {FIT_TABS.map(({ href, label, icon: Icon }) => {
        const active = at(path, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors ${
              active ? "bg-primary text-primary-foreground" : "text-ink-variant hover:text-ink"
            }`}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Phones: fixed bottom tab bar in thumb reach. */
export function BottomNav() {
  const path = usePathname();
  return (
    <nav
      aria-label="Fitness"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-outline-variant bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto grid max-w-[640px] grid-cols-5">
        {FIT_TABS.map(({ href, label, icon: Icon }) => {
          const active = at(path, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex h-16 flex-col items-center justify-center gap-1 text-[0.6875rem] font-bold transition-colors ${
                  active ? "text-ink" : "text-ink-subtle hover:text-ink-variant"
                }`}
              >
                <span className={`grid h-8 w-12 place-items-center rounded-full transition-colors ${active ? "bg-primary text-primary-foreground" : ""}`}>
                  <Icon className="size-[18px]" aria-hidden />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
