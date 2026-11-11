"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { Bot, ChartSpline, CirclePlus, LayoutGrid, Share2, Trophy, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; short: string; icon: LucideIcon; badge?: boolean };

export const NAV: NavItem[] = [
  { href: "/", label: "Overview", short: "Overview", icon: LayoutGrid },
  { href: "/progress", label: "Daily progress", short: "Log", icon: CirclePlus },
  { href: "/analytics", label: "Analytics", short: "Analytics", icon: ChartSpline },
  { href: "/leaderboard", label: "Leaderboard", short: "Ranks", icon: Trophy },
  { href: "/share", label: "Share on X", short: "Share", icon: Share2 },
  { href: "/connect", label: "Connect", short: "Connect", icon: Bot, badge: true },
];

function useActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
}

function ConnectBadge({ className }: { className: string }) {
  return (
    <span className={cn("absolute size-2 rounded-full bg-danger", className)}>
      <span className="sr-only">Telegram not connected</span>
    </span>
  );
}

// These two sit at the bottom of the sidebar, just above the profile button.
const BOTTOM_HREFS = new Set(["/share", "/connect"]);

type SidebarProps = {
  section: "main" | "bottom";
  /** True while the creator hasn't connected the Telegram bot. */
  connectBadge?: boolean;
};

export function SidebarNav({ section, connectBadge = false }: SidebarProps) {
  const isActive = useActive();
  const items = NAV.filter(({ href }) => BOTTOM_HREFS.has(href) === (section === "bottom"));
  return (
    <nav aria-label={section === "main" ? "Main" : "More"} className="flex flex-col gap-1">
      {items.map(({ href, label, icon: Icon, badge }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            data-tour={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors",
              active
                ? "bg-surface font-semibold text-foreground"
                : "text-muted-foreground hover:bg-hover hover:text-foreground",
            )}
          >
            <Icon className={cn("size-[18px]", active && "text-primary")} strokeWidth={1.75} />
            <span className="flex-1">{label}</span>
            {active && <span aria-hidden className="size-1.5 rounded-full bg-primary" />}
            {badge && connectBadge && <ConnectBadge className="top-1.5 right-1.5" />}
          </Link>
        );
      })}
    </nav>
  );
}

// Share is the main action, so it sits in the middle. Connect lives in the account menu.
const PHONE_TABS = ["/", "/progress", "/share", "/analytics", "/leaderboard"];

/** Phone tabs: four quiet ones around one lime Share button. */
export function BottomNav() {
  const isActive = useActive();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-surface-lowest/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {PHONE_TABS.map((tab) => NAV.find((n) => n.href === tab)!).map(({ href, short, icon: Icon }) => {
          const active = isActive(href);
          if (href === "/share") {
            return (
              <li key={href}>
                <Link
                  href={href}
                  data-tour={href}
                  aria-current={active ? "page" : undefined}
                  className="relative flex h-14 flex-col items-center justify-end pb-1.5 text-[11px] font-semibold text-primary"
                >
                  <span className="absolute -top-4 flex size-12 items-center justify-center rounded-full border-4 border-background bg-primary text-primary-foreground transition-colors active:bg-primary-pressed">
                    <Icon className="size-5" strokeWidth={2.25} />
                  </span>
                  {short}
                </Link>
              </li>
            );
          }
          return (
            <li key={href}>
              <Link
                href={href}
                data-tour={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
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

/** A `<details>` menu that closes itself once one of its links has changed the page. */
export function ClosingDetails({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    ref.current?.removeAttribute("open");
  }, [pathname]);
  return (
    <details ref={ref} className={className}>
      {children}
    </details>
  );
}

export function MobileTitle() {
  const isActive = useActive();
  const current = NAV.find((n) => isActive(n.href));
  const pathname = usePathname();
  return <span className="text-xs text-subtle">{current?.label ?? (pathname.startsWith("/profile") ? "Profile" : "")}</span>;
}
