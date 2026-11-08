import { ImageResponse } from "next/og";
import { fmt, fmtDate, fmtPct, fmtSigned } from "@/lib/format";
import { GOAL, isValidTarget, targetPlan } from "@/lib/progress";
import { OG, OG_CACHE, OG_SIZE, OgBar, OgFrame, ogFonts } from "@/lib/og";
import { getPublicProgress } from "@/lib/public";


/**
 * The share card for a creator's 500K deadline (1200×630 PNG), shown by X under a
 * /u/<handle>?target=<date> link. Served at /u/<handle>/target-card?d=<date>&v=<version>.
 */
export async function GET(request: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const target = new URL(request.url).searchParams.get("d") ?? "";
  const [data, fonts] = await Promise.all([getPublicProgress(handle), ogFonts()]);

  if (!data?.latest || !isValidTarget(target, data.latest.date)) {
    return new Response("Not found", { status: 404 });
  }

  const shownHandle = data.profile.handle;
  const total = data.latest.total;
  const pct = Math.min((total / GOAL) * 100, 100);
  const plan = targetPlan(total, data.latest.date, target);

  return new ImageResponse(
    (
      <OgFrame
        right={
          <>
          <span style={{ fontSize: 30, fontWeight: 700, color: OG.lime, letterSpacing: "-0.02em" }}>@{shownHandle}</span>
          </>
        }
      >

        {/* Target + daily number */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 34, color: OG.muted }}>
            Target: <span style={{ color: OG.white, fontWeight: 700, marginLeft: 12 }}>{fmtDate(target)}</span>
          </span>
          <div style={{ display: "flex", alignItems: "baseline", marginTop: 14 }}>
            <span
              style={{ fontFamily: "JetBrains Mono", fontSize: 124, fontWeight: 600, letterSpacing: "-0.05em", lineHeight: 1, color: OG.lime }}
            >
              {plan.remaining === 0 ? "500K" : fmtSigned(plan.perDay)}
            </span>
            {plan.remaining > 0 && (
              <span style={{ fontFamily: "JetBrains Mono", fontSize: 52, fontWeight: 600, color: OG.lime, marginLeft: 6 }}>/day</span>
            )}
          </div>
          <span style={{ fontSize: 32, color: OG.muted, marginTop: 18 }}>
            {plan.remaining === 0 ? "Goal reached" : `${fmt(plan.remaining)} to go in ${plan.days} ${plan.days === 1 ? "day" : "days"}`}
          </span>
        </div>

        {/* Progress */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "JetBrains Mono", fontSize: 24 }}>
            <span style={{ color: OG.white, fontWeight: 600 }}>{fmt(total)} impressions</span>
            <span style={{ color: OG.subtle }}>{fmtPct(pct)} of 500K</span>
          </div>
          <OgBar pct={pct} />
        </div>
      </OgFrame>
    ),
    {
      ...OG_SIZE,
      fonts,
      headers: {
        "Cache-Control": OG_CACHE,
      },
    },
  );
}
