/**
 * Shared pieces for every 1200×630 share image X shows under a progresshub link: size, cache
 * header and fonts. The card itself is components/share/rich-card.tsx. Server-only (reads font files).
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const OG_SIZE = { width: 1200, height: 630 };

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
