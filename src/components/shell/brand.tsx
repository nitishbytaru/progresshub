import Link from "next/link";
import { cn } from "@/lib/utils";

/** The progresshub mark: three rising bars, the last one lime — today on the way to 500K. */
export function BrandMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" fill="#ffffff" />
      <rect x="7" y="17" width="4.5" height="8" rx="1.5" fill="#0b0b0c" />
      <rect x="13.75" y="12" width="4.5" height="13" rx="1.5" fill="#0b0b0c" />
      <rect x="20.5" y="7" width="4.5" height="18" rx="1.5" fill="#0b0b0c" />
      <rect x="20.5" y="7" width="4.5" height="5" rx="1.5" fill="#c8f432" />
    </svg>
  );
}

export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-lg" aria-label="progresshub home">
      <BrandMark />
      <span className="text-[17px] font-bold tracking-[-0.02em] text-foreground">progresshub</span>
    </Link>
  );
}

export function SampleBadge() {
  return (
    <span
      title="Showing fictional sample data until your account is connected"
      className="inline-flex h-6 items-center rounded-full border border-border px-2.5 text-[11px] font-medium text-muted-foreground"
    >
      Sample data
    </span>
  );
}

export function Initials({ name, className = "" }: { name: string; className?: string }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
  return (
    <span
      aria-hidden
      className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background", className)}
    >
      {initials}
    </span>
  );
}
