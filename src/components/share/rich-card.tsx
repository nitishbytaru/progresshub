/**
 * The dense 1200×630 share card. Plain flexbox + inline styles so the exact same markup renders
 * as the static PNG X shows (next/og) and as the animated card in the app. With `animated`, the
 * pieces get `rc-*` classes (keyframes in globals.css) that build the card up and loop, like a GIF.
 * Midnight Lime only: black canvas, white type, lime for the key numbers and the CTA.
 */
import type { CSSProperties, ReactNode } from "react";
import type { RichCardProps, RichIcon } from "@/lib/rich-card";

const C = {
  black: "#0b0b0c",
  white: "#ffffff",
  lime: "#c8f432",
  muted: "#ffffffb3",
  subtle: "#ffffff8c",
  line: "#ffffff24",
  panel: "#ffffff0a",
  track: "#2a2a2e",
} as const;

export type RichFonts = { sans: string; mono: string };
export const OG_FONTS: RichFonts = { sans: "Plus Jakarta Sans", mono: "JetBrains Mono" };

const ICON_PATHS: Record<RichIcon, string[]> = {
  flame: [
    "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z",
  ],
  up: ["M22 7 13.5 15.5 8.5 10.5 2 17", "M16 7h6v6"],
  trophy: [
    "M6 9H4.5a2.5 2.5 0 0 1 0-5H6",
    "M18 9h1.5a2.5 2.5 0 0 0 0-5H18",
    "M4 22h16",
    "M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22",
    "M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22",
    "M18 2H6v7a6 6 0 0 0 12 0V2Z",
  ],
  chart: ["M3 3v18h18", "M18 17V9", "M13 17V5", "M8 17v-3"],
  flag: ["M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z", "M4 22v-7"],
};

function Icon({ name, size = 28 }: { name: RichIcon; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={C.lime} strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">
      {ICON_PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

function Box({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ display: "flex", ...style }}>{children}</div>;
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Animation hooks: a class plus a stagger delay, only when animating in the browser. */
function anim(on: boolean, cls: string, delay = 0): { className?: string; style?: CSSProperties } {
  return on ? { className: cls, style: { animationDelay: `${delay}ms` } } : {};
}

function Avatar({ src, name, size, ring }: { src: string | null; name: string; size: number; ring?: boolean }) {
  const border = ring ? `3px solid ${C.lime}` : `2px solid ${C.line}`;
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- rendered by next/og and in-app alike
    return <img src={src} alt="" width={size} height={size} style={{ width: size, height: size, borderRadius: 999, border, objectFit: "cover" }} />;
  }
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: 999,
        border,
        background: C.track,
        color: C.white,
        fontSize: size * 0.42,
        fontWeight: 700,
      }}
    >
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

function Visual({ v, f, animated }: { v: RichCardProps["visual"]; f: RichFonts; animated: boolean }) {
  if (!v) return <div style={{ display: "flex", height: 44 }} />;

  if (v.type === "days") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", gap: 8 }}>
          {v.days.map((d, i) => (
            <div
              key={d.date}
              {...anim(animated && d.logged, "rc-day", 700 + i * 70)}
              style={{
                display: "flex",
                flex: 1,
                height: 30,
                borderRadius: 7,
                background: d.logged ? C.lime : C.track,
                ...(animated && d.logged ? { animationDelay: `${700 + i * 70}ms` } : {}),
              }}
            />
          ))}
        </div>
        <span style={{ fontFamily: f.mono, fontSize: 17, color: C.subtle }}>last {v.days.length} days</span>
      </div>
    );
  }

  if (v.type === "bar") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: f.mono, fontSize: 19 }}>
          <span style={{ color: C.white, fontWeight: 600 }}>{v.left}</span>
          <span style={{ color: C.subtle }}>{v.right}</span>
        </div>
        <div style={{ display: "flex", height: 16, borderRadius: 999, background: C.track, overflow: "hidden" }}>
          <div
            {...anim(animated, "rc-bar", 650)}
            style={{
              display: "flex",
              width: `${Math.max(Math.min(v.pct, 100), 1.5)}%`,
              background: C.lime,
              borderRadius: 999,
              ...(animated ? { animationDelay: "650ms" } : {}),
            }}
          />
        </div>
      </div>
    );
  }

  const max = Math.max(v.a.value, v.b.value, 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {[
        { ...v.a, color: C.lime },
        { ...v.b, color: "#ffffff99" },
      ].map((row, i) => (
        <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 16, fontFamily: f.mono, fontSize: 18 }}>
          <span style={{ display: "flex", width: 70, color: C.subtle }}>{row.label}</span>
          <div style={{ display: "flex", flex: 1, height: 14, borderRadius: 999, background: C.track, overflow: "hidden" }}>
            <div
              {...anim(animated, "rc-bar", 650 + i * 150)}
              style={{
                display: "flex",
                width: `${Math.max((row.value / max) * 100, 2)}%`,
                background: row.color,
                borderRadius: 999,
                ...(animated ? { animationDelay: `${650 + i * 150}ms` } : {}),
              }}
            />
          </div>
          <span style={{ display: "flex", width: 90, justifyContent: "flex-end", color: C.white, fontWeight: 600 }}>
            +{row.value >= 10_000 ? `${Math.round(row.value / 100) / 10}K` : row.value.toLocaleString("en-US")}
          </span>
        </div>
      ))}
    </div>
  );
}

export function RichCard({ p, fonts = OG_FONTS, animated = false }: { p: RichCardProps; fonts?: RichFonts; animated?: boolean }) {
  const f = fonts;
  const a = (cls: string, delay = 0) => anim(animated, cls, delay);
  const withDelay = (style: CSSProperties, delay: number): CSSProperties => (animated ? { ...style, animationDelay: `${delay}ms` } : style);

  return (
    <div
      style={{
        display: "flex",
        width: 1200,
        height: 630,
        padding: 26,
        background: C.black,
        color: C.white,
        fontFamily: f.sans,
      }}
    >
      {/* Inner frame */}
      <div style={{ display: "flex", flex: 1, border: `2px solid ${C.line}`, borderRadius: 30, padding: "30px 34px", gap: 30 }}>
        {/* Left: the creator's numbers */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
          {/* Headline + who/when */}
          <Box style={{ alignItems: "center", justifyContent: "space-between", gap: 20 }}>
            <span {...a("rc-rise", 0)} style={withDelay({ fontSize: 44, fontWeight: 700, color: C.lime, letterSpacing: "-0.025em", lineHeight: 1 }, 0)}>
              {p.headline}
            </span>
            <Box style={{ alignItems: "center", gap: 12 }}>
              <Avatar src={p.avatarUrl} name={p.handle} size={52} ring />
              <Box style={{ flexDirection: "column", alignItems: "flex-end" }}>
                <span style={{ fontSize: 22, fontWeight: 700 }}>@{clip(p.handle, 16)}</span>
                <span style={{ fontFamily: f.mono, fontSize: 15, color: C.subtle, letterSpacing: "0.08em" }}>{p.dateLabel}</span>
              </Box>
            </Box>
          </Box>

          {/* Hero number + icon stats */}
          <Box style={{ alignItems: "center", gap: 30 }}>
            <Box style={{ flexDirection: "column", minWidth: 300 }}>
              <span
                {...a("rc-hero", 150)}
                style={withDelay({ fontFamily: f.mono, fontSize: 124, fontWeight: 600, letterSpacing: "-0.055em", lineHeight: 1, color: C.white }, 150)}
              >
                {p.hero}
              </span>
              <span style={{ fontSize: 17, fontWeight: 700, color: C.lime, letterSpacing: "0.14em", marginTop: 8, maxWidth: 380 }}>{clip(p.heroUnit, 34)}</span>
            </Box>
            <div style={{ display: "flex", width: 2, alignSelf: "stretch", background: C.line }} />
            <Box style={{ flexDirection: "column", gap: 12 }}>
              {p.lines.map((l, i) => (
                <div key={l.label} {...a("rc-rise", 300 + i * 110)} style={withDelay({ display: "flex", alignItems: "center", gap: 12 }, 300 + i * 110)}>
                  <Icon name={l.icon} size={26} />
                  <span style={{ fontFamily: f.mono, fontSize: 30, fontWeight: 600, letterSpacing: "-0.03em" }}>{l.value}</span>
                  <span style={{ fontSize: 19, color: C.muted }}>{l.label}</span>
                </div>
              ))}
            </Box>
          </Box>

          {/* Stat chips */}
          <Box style={{ gap: 12 }}>
            {p.chips.map((c, i) => (
              <div
                key={c.label}
                {...a("rc-pop", 450 + i * 90)}
                style={withDelay(
                  { display: "flex", flexDirection: "column", flex: 1, padding: "12px 16px", borderRadius: 16, border: `1.5px solid ${C.line}`, background: C.panel },
                  450 + i * 90,
                )}
              >
                <span style={{ fontFamily: f.mono, fontSize: 27, fontWeight: 600, letterSpacing: "-0.03em", color: i === 0 ? C.lime : C.white }}>{c.value}</span>
                <span style={{ fontSize: 15, color: C.subtle }}>{c.label}</span>
              </div>
            ))}
          </Box>

          {/* The card's own visual */}
          <Visual v={p.visual} f={f} animated={animated} />

          {/* CTA */}
          <Box style={{ alignItems: "center", gap: 22 }}>
            <div
              {...a("rc-glow", 900)}
              style={withDelay(
                { display: "flex", alignItems: "center", gap: 10, padding: "12px 26px", borderRadius: 999, background: C.lime, color: C.black, fontSize: 24, fontWeight: 700 },
                900,
              )}
            >
              Make yours
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.black} strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </div>
            <span style={{ fontFamily: f.mono, fontSize: 24, fontWeight: 600, color: C.white }}>{p.site}</span>
          </Box>
        </div>

        {/* Right: who they're racing */}
        <div style={{ display: "flex", flexDirection: "column", width: 300, paddingLeft: 30, borderLeft: `2px solid ${C.line}` }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: C.lime, letterSpacing: "0.12em" }}>RACING WITH</span>
          {p.racers.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", marginTop: 18, rowGap: 18 }}>
              {p.racers.slice(0, 8).map((r, i) => (
                <div
                  key={r.handle}
                  {...a("rc-pop", 500 + i * 90)}
                  style={withDelay({ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: "50%" }, 500 + i * 90)}
                >
                  <Avatar src={r.avatarUrl} name={r.handle} size={68} />
                  <span style={{ fontSize: 16, fontWeight: 700, color: C.white }}>@{clip(r.handle, 11)}</span>
                </div>
              ))}
            </div>
          ) : (
            <span style={{ fontSize: 26, fontWeight: 700, marginTop: 24, lineHeight: 1.2 }}>Be the first on the board.</span>
          )}
          <span style={{ marginTop: "auto", fontFamily: f.mono, fontSize: 17, color: C.subtle }}>
            {p.racing} {p.racing === 1 ? "creator" : "creators"} racing
          </span>
        </div>
      </div>
    </div>
  );
}
