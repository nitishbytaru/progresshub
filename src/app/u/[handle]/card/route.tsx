import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { fmt, fmtCompact, fmtDateShort, fmtPct, fmtSigned } from "@/lib/format";
import { GOAL } from "@/lib/progress";
import { getPublicProgress } from "@/lib/public";

const size = { width: 1200, height: 630 };

const font = (file: string) => readFile(join(process.cwd(), "assets/fonts", file));

const BLACK = "#0b0b0c";
const WHITE = "#ffffff";
const LIME = "#c8f432";
const MUTED = "#ffffffb3";
const SUBTLE = "#ffffff8c";
const LINE = "#ffffff1f";

/**
 * The share card X shows under a progresshub link (1200×630 PNG).
 * Served at /u/<handle>/card?v=<version>; the version changes whenever the numbers on the card do,
 * so browsers and X fetch a fresh image instead of a cached one.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const [data, jakarta500, jakarta700, mono500, mono600] = await Promise.all([
    getPublicProgress(handle),
    font("plus-jakarta-sans-latin-500-normal.woff"),
    font("plus-jakarta-sans-latin-700-normal.woff"),
    font("jetbrains-mono-latin-500-normal.woff"),
    font("jetbrains-mono-latin-600-normal.woff"),
  ]);

  const shownHandle = data?.profile.handle ?? handle;
  const total = data?.latest?.total ?? 0;
  const pct = Math.min((total / GOAL) * 100, 100);
  const facts = [
    data?.latest?.delta != null ? `${fmtSigned(data.latest.delta)} latest day` : null,
    data && data.streak > 1 ? `${data.streak}-day streak` : null,
    data?.eta ? `500K around ${fmtDateShort(data.eta.etaDate)}` : null,
  ].filter(Boolean) as string[];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: BLACK,
          color: WHITE,
          padding: "64px 72px",
          fontFamily: "Plus Jakarta Sans",
          border: `1px solid ${LINE}`,
        }}
      >
        {/* Header: brand + rank */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <svg width="44" height="44" viewBox="0 0 32 32">
              <rect width="32" height="32" rx="8" fill={WHITE} />
              <rect x="7" y="17" width="4.5" height="8" rx="1.5" fill={BLACK} />
              <rect x="13.75" y="12" width="4.5" height="13" rx="1.5" fill={BLACK} />
              <rect x="20.5" y="7" width="4.5" height="18" rx="1.5" fill={BLACK} />
              <rect x="20.5" y="7" width="4.5" height="5" rx="1.5" fill={LIME} />
            </svg>
            <span style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.02em" }}>progresshub</span>
          </div>
          {data?.rank && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: LIME,
                color: BLACK,
                borderRadius: 999,
                padding: "10px 22px",
                fontFamily: "JetBrains Mono",
                fontSize: 28,
                fontWeight: 600,
              }}
            >
              #{data.rank.rank}
              <span style={{ fontFamily: "Plus Jakarta Sans", fontSize: 22, fontWeight: 500 }}>of {data.rank.of} {data.rank.of === 1 ? "creator" : "creators"}</span>
            </div>
          )}
        </div>

        {/* Handle + total */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 56, fontWeight: 700, color: LIME, letterSpacing: "-0.03em" }}>@{shownHandle}</span>
          <div style={{ display: "flex", alignItems: "baseline", gap: 20, marginTop: 8 }}>
            <span style={{ fontFamily: "JetBrains Mono", fontSize: 112, fontWeight: 600, letterSpacing: "-0.05em", lineHeight: 1 }}>
              {fmt(total)}
            </span>
            <span style={{ fontSize: 32, color: MUTED }}>/ 500K impressions</span>
          </div>
        </div>

        {/* Progress + facts */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "JetBrains Mono", fontSize: 24 }}>
            <span style={{ color: LIME, fontWeight: 600 }}>{fmtPct(pct)} of the way</span>
            <span style={{ color: SUBTLE }}>{fmtCompact(GOAL)} goal</span>
          </div>
          <div style={{ display: "flex", height: 18, borderRadius: 999, background: "#2a2a2e", overflow: "hidden" }}>
            <div style={{ width: `${Math.max(pct, 1.5)}%`, background: LIME, borderRadius: 999 }} />
          </div>
          {facts.length > 0 && (
            <div style={{ display: "flex", gap: 28, fontSize: 24, color: MUTED }}>
              {facts.map((f) => (
                <span key={f}>{f}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Plus Jakarta Sans", data: jakarta500, weight: 500, style: "normal" },
        { name: "Plus Jakarta Sans", data: jakarta700, weight: 700, style: "normal" },
        { name: "JetBrains Mono", data: mono500, weight: 500, style: "normal" },
        { name: "JetBrains Mono", data: mono600, weight: 600, style: "normal" },
      ],
      headers: {
        // Versioned URLs make long caching safe; unversioned hits stay short-lived.
        "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=86400",
      },
    },
  );
}
