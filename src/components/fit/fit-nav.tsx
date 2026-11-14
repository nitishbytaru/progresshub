"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartNoAxesColumn, SquarePen } from "lucide-react";

const TABS = [
  { href: "/", label: "Home", icon: ChartNoAxesColumn, match: (p: string) => p === "/" || p === "/fit" },
  { href: "/log", label: "Log", icon: SquarePen, match: (p: string) => p === "/log" || p === "/fit/log" },
];

/** Home | Log tabs. On fit.progresshub.space "/" and "/log" are rewritten to /fit and /fit/log. */
export function FitNav() {
  const path = usePathname();
  return (
    <nav aria-label="Fitness" className="flex rounded-full border border-outline p-1">
      {TABS.map(({ href, label, icon: Icon, match }) => {
        const active = match(path);
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
