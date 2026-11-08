/**
 * Shared pieces for every 1200×630 share image X shows under a progresshub link:
 * palette, fonts, the brand header and the outer frame. Server-only (reads font files).
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const OG_SIZE = { width: 1200, height: 630 };

export const OG = {
  black: "#0b0b0c",
  white: "#ffffff",
  lime: "#c8f432",
  muted: "#ffffffb3",
  subtle: "#ffffff8c",
  line: "#ffffff1f",
  track: "#2a2a2e",
} as const;

export const OG_CACHE = "public, max-age=300, s-maxage=300, stale-while-revalidate=86400";

const font = (file: string) => readFile(join(process.cwd(), "assets/fonts", file));

/** Plus Jakarta Sans (500/700) and JetBrains Mono (500/600), as ImageResponse expects them. */
export async function ogFonts() {
  const [jakarta500, jakarta700, mono500, mono600] = await Promise.all([
    font("plus-jakarta-sans-latin-500-normal.woff"),
    font("plus-jakarta-sans-latin-700-normal.woff"),
    font("jetbrains-mono-latin-500-normal.woff"),
    font("jetbrains-mono-latin-600-normal.woff"),
  ]);
  return [
    { name: "Plus Jakarta Sans", data: jakarta500, weight: 500 as const, style: "normal" as const },
    { name: "Plus Jakarta Sans", data: jakarta700, weight: 700 as const, style: "normal" as const },
    { name: "JetBrains Mono", data: mono500, weight: 500 as const, style: "normal" as const },
    { name: "JetBrains Mono", data: mono600, weight: 600 as const, style: "normal" as const },
  ];
}

/** Logo + wordmark, top left of every card. */
export function OgBrand() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <svg width="44" height="44" viewBox="0 0 32 32">
        <rect width="32" height="32" rx="8" fill={OG.white} />
        <rect x="7" y="17" width="4.5" height="8" rx="1.5" fill={OG.black} />
        <rect x="13.75" y="12" width="4.5" height="13" rx="1.5" fill={OG.black} />
        <rect x="20.5" y="7" width="4.5" height="18" rx="1.5" fill={OG.black} />
        <rect x="20.5" y="7" width="4.5" height="5" rx="1.5" fill={OG.lime} />
      </svg>
      <span style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.02em" }}>progresshub</span>
    </div>
  );
}

/** The black 1200×630 canvas: brand header (with an optional right slot), then the card's own sections. */
export function OgFrame({ right, children }: { right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: OG.black,
        color: OG.white,
        padding: "64px 72px",
        fontFamily: "Plus Jakarta Sans",
        border: `1px solid ${OG.line}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <OgBrand />
        {right}
      </div>
      {children}
    </div>
  );
}

/** Lime progress bar toward 500K. */
export function OgBar({ pct }: { pct: number }) {
  return (
    <div style={{ display: "flex", height: 18, borderRadius: 999, background: OG.track, overflow: "hidden" }}>
      <div style={{ width: `${Math.max(Math.min(pct, 100), 1.5)}%`, background: OG.lime, borderRadius: 999 }} />
    </div>
  );
}
