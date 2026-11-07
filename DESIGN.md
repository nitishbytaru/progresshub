---
name: Midnight Lime
colors:
  # Black family (~50% of the composition)
  canvas: '#0b0b0c'
  surface: '#0b0b0c'
  surface-container-lowest: '#070708'
  surface-container-low: '#111113'
  surface-container: '#161618'
  surface-container-high: '#1d1d20'
  surface-container-highest: '#26262a'
  on-surface: '#ffffff'
  on-surface-variant: '#ffffffb3'
  outline: '#ffffff29'
  outline-variant: '#ffffff14'
  # White family (~40% of the composition)
  inverse-surface: '#ffffff'
  inverse-surface-dim: '#f4f4f5'
  inverse-surface-variant: '#e8e8ea'
  on-inverse-surface: '#0b0b0c'
  on-inverse-surface-variant: '#0b0b0ca6'
  inverse-outline: '#0b0b0c1f'
  # Lime accent (~10% only, attention + clickables)
  primary: '#c8f432'
  on-primary: '#0b0b0c'
  primary-hover: '#d4f75c'
  primary-pressed: '#b3dc22'
  primary-soft: '#c8f4321f'
  focus-ring: '#c8f432'
  # Gradients (black family only)
  gradient-canvas: 'linear-gradient(180deg, #161618 0%, #0b0b0c 60%)'
  gradient-card: 'linear-gradient(145deg, #1d1d20 0%, #0b0b0c 100%)'
  gradient-radial-glow: 'radial-gradient(ellipse at top, #26262a 0%, #0b0b0c 70%)'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 3rem
    fontWeight: '700'
    lineHeight: 3.5rem
    letterSpacing: -0.03em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 2.25rem
    fontWeight: '700'
    lineHeight: 2.75rem
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 2rem
    fontWeight: '700'
    lineHeight: 2.5rem
    letterSpacing: -0.025em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.75rem
    letterSpacing: -0.015em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: 1.5rem
    letterSpacing: -0.01em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.375rem
    letterSpacing: -0.005em
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: 1.125rem
    letterSpacing: '0'
  metric-display:
    fontFamily: JetBrains Mono
    fontSize: 2.25rem
    fontWeight: '600'
    lineHeight: 2.5rem
    letterSpacing: -0.04em
  metric-display-mobile:
    fontFamily: JetBrains Mono
    fontSize: 1.75rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.03em
  metric-stat:
    fontFamily: JetBrains Mono
    fontSize: 1.125rem
    fontWeight: '500'
    lineHeight: 1.5rem
    letterSpacing: -0.02em
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 0.75rem
    fontWeight: '500'
    lineHeight: 1rem
    letterSpacing: 0.04em
  label-ui:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.8125rem
    fontWeight: '600'
    lineHeight: 1.125rem
    letterSpacing: 0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  margin: 2rem
  margin-sm: 1rem
  margin-lg: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

Command center for X (Twitter) creators tracking impressions, daily progress and monetization milestones. Strict three-color system: **midnight black `#0b0b0c`**, **pure white `#FFFFFF`**, and a single accent, **lime green `#C8F432`**. No other hues anywhere: no blues, purples, emeralds, reds or tinted grays. Every neutral is black or white at a different opacity or mix.

Personality: high-contrast, editorial, confident. Black gives depth, white gives clarity, and lime is the one place the eye should go.

## Color Composition: 50 / 40 / 10

Every screen should read as roughly **50% black, 40% white, 10% lime**.

### Black (~50%): foundation and depth
- Page canvas, app shell, sidebar and top nav are `#0b0b0c`.
- Depth comes from **gradients and shades of the black itself**, never from colored surfaces: `gradient-canvas` on page backgrounds, `gradient-card` on dark cards, `gradient-radial-glow` behind hero metrics.
- Elevation steps: `#111113` → `#161618` → `#1d1d20` → `#26262a`.
- Hairline borders on dark surfaces: white at 8–16% opacity (`#ffffff14`, `#ffffff29`).

### White (~40%): content and contrast
- All primary text on dark surfaces is `#FFFFFF`. Secondary text is white at 70%, tertiary at 45%.
- **White is also a surface.** Large white panels carry real visual weight: main KPI cards, the "Add Daily Progress" form panel, leaderboard table bodies, modal sheets, and chart panels. Text on white is `#0b0b0c`, with `#0b0b0ca6` for secondary text and `#0b0b0c1f` for dividers.
- Alternate black and white blocks to create rhythm, for example a white KPI strip on a black canvas or a black chart card next to a white summary card.
- Secondary buttons: white fill with black text, or a transparent fill with a 1px white border.

### Lime (~10%): attention only
Use `#C8F432` **only** for elements that need the most attention:
- The single primary CTA per view (e.g. "Log Progress", "Share on X", "Save"): lime fill, `#0b0b0c` text.
- Active nav item indicator, selected tab or segment, toggle "on" state, checked checkbox.
- Focus rings (2px lime).
- The hero metric's key delta or progress-bar fill toward a milestone, and the primary chart series line.
- Current user's row highlight on the leaderboard (lime left bar + `primary-soft` tint).

Never use lime for large backgrounds, body text, decorative illustration, borders on every card, or more than one competing CTA per area.

### States without extra hues
- Positive change: lime text or lime badge with ▲.
- Negative change: white (on black) or black (on white) text with ▼ and reduced opacity. **No red.**
- Disabled: 30% opacity of the base color.
- Hover on lime: `#d4f75c`; pressed: `#b3dc22`. Hover on black surfaces: step one elevation lighter.

### Charts
- Primary series: lime line or bars.
- Comparison or forecast series: white at 60% (dashed for projections).
- Gridlines: white at 6–8% on dark panels, black at 8% on white panels.
- Area fills: lime at 12% fading to transparent.

## Typography

- **Plus Jakarta Sans** for headings, navigation, and body.
- **JetBrains Mono** for all numbers, metrics, deltas, timestamps and uppercase micro-labels (tabular numerals).
- Headlines are white on black or black on white. Never set headlines in lime, except for a single key number when it is the hero focal point.

## Shape & Elevation

- 8px default radius, 12px on large cards and modals, full radius on pills and badges.
- No colored shadows. Dark surfaces get a subtle inner top highlight (`#ffffff0f`). White panels get a soft black shadow (`0 8px 24px #0b0b0c40`).
