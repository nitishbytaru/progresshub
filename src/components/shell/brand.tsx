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
    <Link href="/" className="flex items-center gap-2 rounded-lg sm:gap-2.5" aria-label="progresshub home">
      {/* Smaller on phones so the header stays light. */}
      <BrandMark className="size-6 sm:size-8" />
      <span className="text-[15px] font-bold tracking-[-0.02em] text-foreground sm:text-[17px]">progresshub</span>
    </Link>
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

/** Profile photo when the creator has one (Google), otherwise initials. */
export function Avatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
  if (!src) return <Initials name={name} className={className} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- remote avatar from the auth provider
    <img
      src={src}
      alt=""
      referrerPolicy="no-referrer"
      className={cn("size-8 shrink-0 rounded-full object-cover", className)}
    />
  );
}
