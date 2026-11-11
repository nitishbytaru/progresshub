import { ImageResponse } from "next/og";
import { fmt, fmtCompact, fmtDateShort, fmtPct, fmtSigned } from "@/lib/format";
import { GOAL } from "@/lib/progress";
import { OG, OG_CACHE, OG_SIZE, OgBar, OgFrame, ogFonts } from "@/lib/og";
import { getPublicProgress } from "@/lib/public";


/**
 * The share card X shows under a progresshub link (1200×630 PNG).
 * Served at /u/<handle>/card?v=<version>; the version changes whenever the numbers on the card do,
 * so browsers and X fetch a fresh image instead of a cached one.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const [data, fonts] = await Promise.all([getPublicProgress(handle), ogFonts()]);

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
      <OgFrame
        right={
          <>
          {(total >= GOAL || data?.rank) && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: OG.lime,
                color: OG.black,
                borderRadius: 999,
                padding: "10px 22px",
                fontFamily: "JetBrains Mono",
                fontSize: 28,
                fontWeight: 600,
              }}
            >
              {total >= GOAL || !data?.rank ? (
                // 500K reached: the race is over, so the card shows the finish instead of a place.
                <span style={{ fontFamily: "Plus Jakarta Sans", fontSize: 24, fontWeight: 700 }}>Race finished</span>
              ) : (
                <>
                  #{data.rank.rank}
                  <span style={{ fontFamily: "Plus Jakarta Sans", fontSize: 22, fontWeight: 500 }}>of {data.rank.of} {data.rank.of === 1 ? "creator" : "creators"}</span>
                </>
              )}
            </div>
          )}
          </>
        }
      >

        {/* Handle + total */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 56, fontWeight: 700, color: OG.lime, letterSpacing: "-0.03em" }}>@{shownHandle}</span>
          <div style={{ display: "flex", alignItems: "baseline", gap: 20, marginTop: 8 }}>
            <span style={{ fontFamily: "JetBrains Mono", fontSize: 112, fontWeight: 600, letterSpacing: "-0.05em", lineHeight: 1 }}>
              {fmt(total)}
            </span>
            <span style={{ fontSize: 32, color: OG.muted }}>/ 500K impressions</span>
          </div>
        </div>

        {/* Progress + facts */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "JetBrains Mono", fontSize: 24 }}>
            <span style={{ color: OG.lime, fontWeight: 600 }}>{fmtPct(pct)} of the way</span>
            <span style={{ color: OG.subtle }}>{fmtCompact(GOAL)} goal</span>
          </div>
          <OgBar pct={pct} />
          {facts.length > 0 && (
            <div style={{ display: "flex", gap: 28, fontSize: 24, color: OG.muted }}>
              {facts.map((f) => (
                <span key={f}>{f}</span>
              ))}
            </div>
          )}
        </div>
      </OgFrame>
    ),
    {
      ...OG_SIZE,
      fonts,
      headers: {
        // Versioned URLs make long caching safe; unversioned hits stay short-lived.
        "Cache-Control": OG_CACHE,
      },
    },
  );
}
