"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartSpline, CirclePlus, LayoutGrid, Trophy, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; short: string; icon: LucideIcon };

export const NAV: NavItem[] = [
  { href: "/", label: "Overview", short: "Overview", icon: LayoutGrid },
  { href: "/progress", label: "Daily progress", short: "Log", icon: CirclePlus },
  { href: "/analytics", label: "Analytics", short: "Analytics", icon: ChartSpline },
  { href: "/leaderboard", label: "Leaderboard", short: "Leaderboard", icon: Trophy },
];

function useActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
}

export function SidebarNav() {
  const isActive = useActive();
  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors",
              active
                ? "bg-surface font-semibold text-foreground"
                : "text-muted-foreground hover:bg-surface-low hover:text-foreground",
            )}
          >
            <Icon className={cn("size-[18px]", active && "text-primary")} strokeWidth={1.75} />
            <span className="flex-1">{label}</span>
            {active && <span aria-hidden className="size-1.5 rounded-full bg-primary" />}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav() {
  const isActive = useActive();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-surface-lowest/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {NAV.map(({ href, short, icon: Icon }) => {
          const active = isActive(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-subtle hover:text-foreground",
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2 : 1.75} />
                {short}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function MobileTitle() {
  const isActive = useActive();
  const current = NAV.find((n) => isActive(n.href));
  return <span className="text-xs text-subtle">{current?.label ?? ""}</span>;
}
