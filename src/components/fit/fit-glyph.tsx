import type { SVGProps } from "react";

/** The Fitness "Ascent" mark: axiom point over two rep chevrons. Inherits color. */
export function FitGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={24}
      height={24}
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M5 20 12 13 19 20" opacity={0.45} />
      <path d="M5 15 12 8 19 15" />
      <circle cx="12" cy="3.5" r="1.75" fill="currentColor" stroke="none" />
    </svg>
  );
}
