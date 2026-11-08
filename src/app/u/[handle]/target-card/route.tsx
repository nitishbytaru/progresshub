import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { fmt, fmtDate, fmtPct, fmtSigned } from "@/lib/format";
import { GOAL, isValidTarget, targetPlan } from "@/lib/progress";
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
 * The share card for a creator's 500K deadline (1200×630 PNG), shown by X under a
 * /u/<handle>?target=<date> link. Served at /u/<handle>/target-card?d=<date>&v=<version>.
 */
export async function GET(request: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const target = new URL(request.url).searchParams.get("d") ?? "";
  const [data, jakarta500, jakarta700, mono500, mono600] = await Promise.all([
    getPublicProgress(handle),
    font("plus-jakarta-sans-latin-500-normal.woff"),
    font("plus-jakarta-sans-latin-700-normal.woff"),
    font("jetbrains-mono-latin-500-normal.woff"),
    font("jetbrains-mono-latin-600-normal.woff"),
  ]);

  if (!data?.latest || !isValidTarget(target, data.latest.date)) {
    return new Response("Not found", { status: 404 });
  }

  const shownHandle = data.profile.handle;
  const total = data.latest.total;
  const pct = Math.min((total / GOAL) * 100, 100);
  const plan = targetPlan(total, data.latest.date, target);

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
        {/* Header: brand + handle */}
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
          <span style={{ fontSize: 30, fontWeight: 700, color: LIME, letterSpacing: "-0.02em" }}>@{shownHandle}</span>
        </div>

        {/* Target + daily number */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 34, color: MUTED }}>
            Target: <span style={{ color: WHITE, fontWeight: 700, marginLeft: 12 }}>{fmtDate(target)}</span>
          </span>
          <div style={{ display: "flex", alignItems: "baseline", marginTop: 14 }}>
            <span
              style={{ fontFamily: "JetBrains Mono", fontSize: 124, fontWeight: 600, letterSpacing: "-0.05em", lineHeight: 1, color: LIME }}
            >
              {plan.remaining === 0 ? "500K" : fmtSigned(plan.perDay)}
            </span>
            {plan.remaining > 0 && (
              <span style={{ fontFamily: "JetBrains Mono", fontSize: 52, fontWeight: 600, color: LIME, marginLeft: 6 }}>/day</span>
            )}
          </div>
          <span style={{ fontSize: 32, color: MUTED, marginTop: 18 }}>
            {plan.remaining === 0 ? "Goal reached" : `${fmt(plan.remaining)} to go in ${plan.days} ${plan.days === 1 ? "day" : "days"}`}
          </span>
        </div>

        {/* Progress */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "JetBrains Mono", fontSize: 24 }}>
            <span style={{ color: WHITE, fontWeight: 600 }}>{fmt(total)} impressions</span>
            <span style={{ color: SUBTLE }}>{fmtPct(pct)} of 500K</span>
          </div>
          <div style={{ display: "flex", height: 18, borderRadius: 999, background: "#2a2a2e", overflow: "hidden" }}>
            <div style={{ width: `${Math.max(pct, 1.5)}%`, background: LIME, borderRadius: 999 }} />
          </div>
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
        "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=86400",
      },
    },
  );
}
