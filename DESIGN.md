---
name: Midnight Lime
colors:
  # Black family (~50% of the composition)
  canvas: '#0b0b0c'
  surface: '#0b0b0c'
  surface-container-lowest: '#0b0b0c'
  surface-container-low: '#0b0b0c'
  surface-container: '#0b0b0c'
  surface-container-high: '#0b0b0c'
  surface-container-highest: '#0b0b0c'
  track: '#2a2a2e'
  hover: '#ffffff0d'
  on-surface: '#ffffff'
  on-surface-variant: '#ffffffb3'
  outline: '#ffffff29'
  outline-variant: '#ffffff14'
  # White family (~40%: text, icons, chips. Never card, table or panel fills)
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

Every screen should read as roughly **50% black, 40% white, 10% lime**. White's share comes from type, numbers, icons and small chips. **Every card, table, panel and modal is black.** There are no white surfaces in the app.

### Black (~50%): foundation and depth
- Page canvas, app shell, sidebar and top nav are `#0b0b0c`.
- **Everything is solid `#0b0b0c`:** page, sidebar, top bar, cards, tables, inputs, modals. There are no gradients and no grey elevation shades. This is a product-owner decision (Nov 7, 2026): the user rejected the grey cast of `#111113`–`#26262a` surfaces and black gradients.
- Separation comes only from hairline borders (`#ffffff1f` for panels and inputs, `#ffffff14` for dividers).
- The single grey tone, `track` `#2a2a2e`, is reserved for thin progress-bar tracks and scrollbar thumbs.
- Hairline borders on dark surfaces: white at 8–16% opacity (`#ffffff14`, `#ffffff29`).

### White (~40%): content and contrast, never a surface
- All primary text on dark surfaces is `#FFFFFF`. Secondary text is white at 70%, tertiary at 45%.
- **White is never a surface.** KPI strips, forms, tables, leaderboard bodies, chart panels and modal sheets are all solid black with a hairline border. This is a product-owner decision (Nov 7, 2026) that replaces the earlier white-panel rule.
- Small white fills are allowed only at chip scale: avatar initials, a selected segment, a rank badge, the "You" tag.
- The only exception is the optional **light style of the shareable progress card image** posted to X. It is an exported image, not app UI.
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
- Tutorial highlight (user-approved exception): hot magenta `#FF2E93` (`--tour-highlight`, `bg-tour`/`border-tour`) marks what the first-run tutorial is explaining. Use it only in `src/components/tour/`.
- Disabled: 30% opacity of the base color.
- Hover on lime: `#d4f75c`; pressed: `#b3dc22`. Hover on black surfaces: a momentary `#ffffff0d` wash (feedback only, never a resting fill).

### Charts
- Primary series: lime line or bars.
- Comparison or forecast series: white at 60% (dashed for projections).
- Gridlines: white at 6–8% on dark panels.
- Area fills: lime at 12% fading to transparent.

## Typography

- **Plus Jakarta Sans** for headings, navigation, and body.
- **JetBrains Mono** for all numbers, metrics, deltas, timestamps and uppercase micro-labels (tabular numerals).
- Headlines are white on black or black on white. Never set headlines in lime, except for a single key number when it is the hero focal point.

## Shape & Elevation

- 8px default radius, 12px on large cards and modals, full radius on pills and badges.
- No colored shadows, no inner highlights, no glows. Flat black with hairline borders.
