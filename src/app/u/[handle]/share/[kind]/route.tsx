import { ImageResponse } from "next/og";
import { fmtCompact, fmtSigned } from "@/lib/format";
import { OG, OG_CACHE, OG_SIZE, OgBar, OgFrame, ogFonts } from "@/lib/og";
import { getPublicShareData } from "@/lib/share-data";
import { buildShareCard, isImageKind, type CardFace } from "@/lib/share-cards";

/**
 * Share images for the streak, rank, gain and milestone cards (1200×630 PNG), shown by X under a
 * /u/<handle>?share=<kind> link. Served at /u/<handle>/share/<kind>?v=<version>.
 */
export async function GET(request: Request, { params }: { params: Promise<{ handle: string; kind: string }> }) {
  const { handle, kind } = await params;
  if (!isImageKind(kind)) return new Response("Not found", { status: 404 });

  const [data, fonts] = await Promise.all([getPublicShareData(handle), ogFonts()]);
  const milestone = Number(new URL(request.url).searchParams.get("m")) || undefined;
  const card = data ? buildShareCard(kind, data, { milestone }) : null;
  if (!data || !card?.available || !card.face) return new Response("Not found", { status: 404 });
  const face = card.face;

  return new ImageResponse(
    (
      <OgFrame right={<span style={{ fontSize: 30, fontWeight: 700, color: OG.lime, letterSpacing: "-0.02em" }}>@{data.handle}</span>}>
        {/* Label + the one big number */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 34, color: OG.muted }}>{face.label}</span>
          <div style={{ display: "flex", alignItems: "baseline", marginTop: 10 }}>
            <span
              style={{ fontFamily: "JetBrains Mono", fontSize: 150, fontWeight: 600, letterSpacing: "-0.05em", lineHeight: 1, color: OG.lime }}
            >
              {face.hero}
            </span>
            {face.unit && <span style={{ fontSize: 40, color: OG.white, fontWeight: 700, marginLeft: 22 }}>{face.unit}</span>}
          </div>
          <span style={{ fontSize: 30, color: OG.muted, marginTop: 16 }}>{face.sub}</span>
        </div>

        <Visual face={face} />
      </OgFrame>
    ),
    { ...OG_SIZE, fonts, headers: { "Cache-Control": OG_CACHE } },
  );
}

function Visual({ face }: { face: CardFace }) {
  const v = face.visual;
  if (!v) return <div style={{ display: "flex" }} />;

  if (v.type === "days") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", gap: 10 }}>
          {v.days.map((d) => (
            <div key={d.date} style={{ display: "flex", flex: 1, height: 36, borderRadius: 8, background: d.logged ? OG.lime : OG.track }} />
          ))}
        </div>
        <span style={{ fontFamily: "JetBrains Mono", fontSize: 22, color: OG.subtle }}>last {v.days.length} days</span>
      </div>
    );
  }

  if (v.type === "bar") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "JetBrains Mono", fontSize: 24 }}>
          <span style={{ color: OG.white, fontWeight: 600 }}>{v.left}</span>
          <span style={{ color: OG.subtle }}>{v.right}</span>
        </div>
        <OgBar pct={v.pct} />
      </div>
    );
  }

  // compare: latest vs best day
  const max = Math.max(v.a.value, v.b.value, 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {[
        { ...v.a, color: OG.lime },
        { ...v.b, color: "#ffffff99" },
      ].map((row) => (
        <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 20, fontFamily: "JetBrains Mono", fontSize: 24 }}>
          <span style={{ width: 90, color: OG.subtle }}>{row.label}</span>
          <div style={{ display: "flex", flex: 1, height: 18, borderRadius: 999, background: OG.track, overflow: "hidden" }}>
            <div style={{ width: `${Math.max((row.value / max) * 100, 2)}%`, background: row.color, borderRadius: 999 }} />
          </div>
          <span style={{ width: 130, textAlign: "right", color: OG.white, fontWeight: 600 }}>
            {row.value >= 10_000 ? `+${fmtCompact(row.value)}` : fmtSigned(row.value)}
          </span>
        </div>
      ))}
    </div>
  );
}
