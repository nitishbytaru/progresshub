---
name: Carbon Ice
scope: fit.progresshub.space only (src/app/(fit), src/components/fit). Never mix with Midnight Lime.
colors:
  # Carbon family (~50%)
  canvas: '#0e0d10'
  surface: '#0e0d10'
  surface-container-lowest: '#0a090c'
  surface-container-low: '#121115'
  surface-container: '#16151a'
  surface-container-high: '#1f1e24'
  surface-container-highest: '#29272f'
  track: '#2b2930'
  hover: '#f5f5f70d'
  pressed: '#f5f5f714'
  on-surface: '#f5f5f7'
  on-surface-variant: '#f5f5f7b3'
  on-surface-subtle: '#f5f5f77a'
  outline: '#f5f5f729'
  outline-variant: '#f5f5f714'
  # Chalk family (~40%: text, icons, chips)
  inverse-surface: '#f5f5f7'
  inverse-surface-dim: '#e9e9ec'
  inverse-surface-variant: '#dcdce0'
  on-inverse-surface: '#0e0d10'
  on-inverse-surface-variant: '#0e0d10a6'
  inverse-outline: '#0e0d101f'
  # Ice blue accent (~10%: CTAs, active, progress, PRs, focus)
  primary: '#5b9dff'
  on-primary: '#0e0d10'   # 7.1:1. Chalk on ice blue is 2.8:1 and fails AA
  primary-hover: '#7aafff'
  primary-pressed: '#4688f0'
  primary-soft: '#5b9dff1f'
  primary-track: '#5b9dff33'
  primary-glow: '#5b9dff66'
  focus-ring: '#5b9dff'
typography: same scale as DESIGN.md (Plus Jakarta Sans + JetBrains Mono), plus
  metric-hero: { fontFamily: JetBrains Mono, fontSize: 4.5rem, fontWeight: '600', lineHeight: 4.5rem, letterSpacing: -0.05em }
rounded: same as DESIGN.md (sm .25rem, DEFAULT .5rem, md .75rem, lg 1rem, xl 1.5rem, full)
spacing: { gutter: 1.5rem, gutter-sm: 1rem, tap-min: 3rem }
---

# Carbon Ice

The Fitness sister app to progresshub. It shares the family structure (type, radii, spacing, "label + big mono number + tiny visual") and has a warm carbon + ice blue palette, so it never reads as the lime analytics app.

## Rules
- 50 / 40 / 10: carbon surfaces, chalk ink, ice blue accent. Use no other hues, including no red or green for trends: show ▲/▼ in chalk.
- Lifted surfaces are allowed (`#16151a` cards, `#1f1e24` active or raised), separated by `outline-variant` hairlines.
- Ice blue is only for primary CTAs, active state, progress, PR badges, timers and focus. Never fill a whole card with it.
- Text on ice blue is always carbon `#0e0d10`.
- Tap targets are at least 48px, because people use it mid-workout.

## Components
- **Primary button:** ice blue fill, carbon text, weight 700, `rounded-full`, at least 48px tall. Hover is primary-hover; pressed is primary-pressed plus scale .98.
- **Secondary button:** transparent, 1px outline, chalk text, hover fill.
- **Metric card:** surface-container, hairline border, `rounded-lg`, a mono label on the left and a big mono number on the right (ice blue only for the key one).
- **Active card:** surface-container-high plus a 1px ice blue left edge.
- **Timer:** metric-hero digits; 6px track ring with an ice blue arc, plus primary-glow in the final 10 seconds.
- **Progress bar:** 6px, track background, ice blue fill, rounded, with a tiny mono tag.
- **PR badge:** primary-soft fill, ice blue mono "PR", rounded-full.
- **Weight logger:** big decimal input with a "kg" suffix, ice blue focus border, full-width primary button, and a 7-day square strip (ice blue = logged, track = missed, today ringed).

## Logo: "Ascent"
A 24-unit grid with 3-unit round strokes: top chevron `M5 15 12 8 19 15`, lower chevron `M5 20 12 13 19 20` at 45% opacity, and the axiom dot at (12, 3.5) r1.75. App icon: the grid ×32 (768px) centred on a 1024 squircle (rx 228), ice blue on carbon. Files: `src/app/(fit)/fit/icon.svg` and `src/components/fit/fit-glyph.tsx`.
