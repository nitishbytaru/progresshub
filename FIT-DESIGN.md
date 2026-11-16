---
name: Bumper Plates
description: progresshub fit (fit.progresshub.space). Body weight, gym days and muscle groups, read as a loaded barbell on a gym-floor black.
scope: fit.progresshub.space only (src/app/(fit), src/components/fit, src/lib/fit-units.ts). Its own document and stylesheet; never mixes with Midnight Lime.
colors:
  # Rubber family (~50%): gym-floor ground and lifted panels
  rubber: '#141414'
  panel: '#1b1b1b'
  panel-high: '#242424'
  track: '#2e2e2e'
  hover: '#f4f4f20f'
  outline: '#f4f4f229'
  outline-variant: '#f4f4f214'
  steel: '#9aa3ad'
  # Chalk family (~40%): ink, and the action colour
  chalk: '#f4f4f2'
  chalk-variant: '#f4f4f2b8'
  chalk-subtle: '#f4f4f285'
  chalk-soft: '#f4f4f21a'
  primary: '#f4f4f2'
  on-primary: '#141414'
  primary-hover: '#ffffff'
  primary-pressed: '#d9d9d5'
  focus-ring: '#f4f4f2'
  # IWF bumper plates (~10%): data only, one per muscle group
  plate-chest: '#d7262e'
  plate-back: '#1e5bc6'
  plate-legs: '#f2c230'
  plate-shoulders: '#2f8f4e'
  plate-biceps: '#f2711c'
  plate-triceps: '#8b4fd8'
  plate-ink-light: '#ffffff'
  plate-ink-dark: '#141414'
typography:
  display-hero:
    fontFamily: Barlow Condensed, Archivo, sans-serif
    fontSize: 5.5rem
    fontWeight: 700
    lineHeight: 0.85
    letterSpacing: -0.02em
    fontFeature: '"tnum"'
  display-hero-wide:
    fontFamily: Barlow Condensed, Archivo, sans-serif
    fontSize: 6rem
    fontWeight: 700
    lineHeight: 0.85
    letterSpacing: -0.02em
    fontFeature: '"tnum"'
  display-input:
    fontFamily: Barlow Condensed, Archivo, sans-serif
    fontSize: 3.75rem
    fontWeight: 700
    lineHeight: 1
    letterSpacing: -0.01em
    fontFeature: '"tnum"'
  headline-stamp:
    fontFamily: Barlow Condensed, Archivo, sans-serif
    fontSize: 3rem
    fontWeight: 700
    lineHeight: 0.9
    letterSpacing: -0.01em
  headline-stamp-wide:
    fontFamily: Barlow Condensed, Archivo, sans-serif
    fontSize: 3.75rem
    fontWeight: 700
    lineHeight: 0.9
    letterSpacing: -0.01em
  title-stamp:
    fontFamily: Barlow Condensed, Archivo, sans-serif
    fontSize: 2.25rem
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.01em
  numeral-lg:
    fontFamily: Barlow Condensed, Archivo, sans-serif
    fontSize: 1.875rem
    fontWeight: 700
    lineHeight: 1
    fontFeature: '"tnum"'
  numeral-md:
    fontFamily: Barlow Condensed, Archivo, sans-serif
    fontSize: 1.5rem
    fontWeight: 700
    lineHeight: 2rem
    fontFeature: '"tnum"'
  numeral-sm:
    fontFamily: Barlow Condensed, Archivo, sans-serif
    fontSize: 1.25rem
    fontWeight: 700
    lineHeight: 1.75rem
    fontFeature: '"tnum"'
  body:
    fontFamily: Archivo, system-ui, sans-serif
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.5rem
  body-sm:
    fontFamily: Archivo, system-ui, sans-serif
    fontSize: 0.875rem
    fontWeight: 600
    lineHeight: 1.25rem
  label-rim:
    fontFamily: Archivo, system-ui, sans-serif
    fontSize: 0.75rem
    fontWeight: 700
    lineHeight: 1rem
    letterSpacing: 0.14em
  caption:
    fontFamily: Archivo, system-ui, sans-serif
    fontSize: 0.75rem
    fontWeight: 400
    lineHeight: 1rem
  micro:
    fontFamily: Archivo, system-ui, sans-serif
    fontSize: 0.6875rem
    fontWeight: 700
    lineHeight: 1rem
rounded:
  plate-sm: 2px
  plate: 3px
  sm: 4px
  md: 6px
  lg: 8px
  xl: 12px
  2xl: 16px
  full: 9999px
spacing:
  hairline-gap: 3px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 20px
  2xl: 24px
  header: 64px
  container: 640px
components:
  button-primary:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.on-primary}'
    typography: '{typography.body}'
    rounded: '{rounded.full}'
    padding: 0 24px
    height: 48px
  button-primary-hover:
    backgroundColor: '{colors.primary-hover}'
    textColor: '{colors.on-primary}'
  button-primary-pressed:
    backgroundColor: '{colors.primary-pressed}'
    textColor: '{colors.on-primary}'
  button-submit:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.on-primary}'
    rounded: '{rounded.full}'
    height: 56px
    width: 100%
  button-outline:
    backgroundColor: transparent
    textColor: '{colors.chalk-variant}'
    typography: '{typography.body-sm}'
    rounded: '{rounded.full}'
    padding: 0 24px
    height: 48px
  button-outline-hover:
    backgroundColor: '{colors.hover}'
    textColor: '{colors.chalk}'
  chip:
    backgroundColor: transparent
    textColor: '{colors.chalk-variant}'
    typography: '{typography.body-sm}'
    rounded: '{rounded.full}'
    padding: 0 16px
    height: 40px
  chip-active:
    backgroundColor: '{colors.chalk-soft}'
    textColor: '{colors.chalk}'
  chip-due:
    backgroundColor: '{colors.chalk-soft}'
    textColor: '{colors.chalk}'
    typography: '{typography.micro}'
    rounded: '{rounded.full}'
    padding: 2px 8px
  nav-tabs:
    backgroundColor: transparent
    rounded: '{rounded.full}'
    padding: 4px
  nav-tab:
    textColor: '{colors.chalk-variant}'
    typography: '{typography.body-sm}'
    rounded: '{rounded.full}'
    padding: 0 14px
    height: 36px
  nav-tab-active:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.on-primary}'
  card:
    backgroundColor: '{colors.panel}'
    textColor: '{colors.chalk}'
    rounded: '{rounded.2xl}'
    padding: 16px
  popover:
    backgroundColor: '{colors.panel-high}'
    textColor: '{colors.chalk}'
    rounded: '{rounded.lg}'
    padding: 12px
  input-weight:
    backgroundColor: '{colors.rubber}'
    textColor: '{colors.chalk}'
    typography: '{typography.display-input}'
    rounded: '{rounded.2xl}'
    padding: 0 20px
    height: 80px
  muscle-toggle:
    backgroundColor: transparent
    textColor: '{colors.chalk-variant}'
    typography: '{typography.body-sm}'
    rounded: '{rounded.xl}'
    padding: 0 10px
    height: 48px
  plate-tile:
    typography: '{typography.numeral-md}'
    rounded: '{rounded.full}'
    size: 48px
  unit-toggle-active:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.on-primary}'
    typography: '{typography.micro}'
    rounded: '{rounded.full}'
    height: 28px
---

# Design System: Bumper Plates

## Overview

**Creative North Star: "The Loaded Bar"**

Training is load. The fit app is a gym floor at night: black rubber matting with a faint EPDM speckle, a steel barbell across the top of Home, and coloured bumper plates sliding onto its sleeves, one plate per gym day, coloured by the muscle trained. Body weight is stamped beneath it in big condensed numerals, the way a plate is stamped with its kilos. It refuses the fitness category's white-card dashboard with a blue line chart.

The composition is a single narrow column (640px) read top to bottom: the week as a bar, today's weight, the 30-day split as six plate faces, the weeks as stacked plates, the 90-day trend, and the weigh-in tally. Ink is chalk: the only bright neutral, and also the action colour, like chalked hands on a black bar. Colour belongs to the plates, and the plates belong to the data.

This system is a sister to progresshub's Midnight Lime, not a theme of it. It ships its own root layout, its own stylesheet (`src/app/(fit)/fit/fit.css`, which never imports `globals.css`) and its own fonts. Shared shadcn primitives read the same semantic variable names, so they render as Bumper Plates here with no code changes.

**Key Characteristics:**
- Rubber black ground with a speckle texture; panels lifted by one tonal step and a hairline, never by shadow.
- Chalk is both ink and the single action colour; there is no accent hue.
- Six IWF bumper-plate colours, one per muscle group, used only to encode muscle data.
- Barlow Condensed stamped numerals over Archivo UI; uppercase tracked rim labels as section titles.
- The barbell is the signature object; plates load with an overshoot (the clank).

## Colors

A near-monochrome rubber-and-chalk field (~90%) with six saturated plate colours (~10%) that only ever mean a muscle group.

### Primary
- **Chalk** (`chalk` / `primary`): all ink, the filled action pill, the active nav tab, the active unit toggle, the gym-on toggle, the 7-day average line on the trend, selection background and the focus outline. Hover lifts to **Bare White** (`primary-hover`); press settles to **Worn Chalk** (`primary-pressed`). Text on chalk is rubber (`on-primary`).
- **Chalk Dust** (`chalk-soft`): the active chip fill and the "due" tag behind chalk text.

### Tertiary (data: the plates)
- **Chest Red** (`plate-chest`), **Back Blue** (`plate-back`), **Legs Yellow** (`plate-legs`), **Shoulders Green** (`plate-shoulders`), **Biceps Orange** (`plate-biceps`), **Triceps Violet** (`plate-triceps`): one per muscle group. The first four follow the IWF plate set; biceps and triceps were chalk-white and steel, which read as nearly the same pale neutral, so they were changed to orange and violet (user-approved, 2026-11-15). Exposed in code as `PLATE[muscle].fill` in `src/lib/fit-units.ts` and `bg-plate-*` utilities. Each carries a fixed ink: Bare White (`plate-ink-light`) on chest, back and triceps, Rubber (`plate-ink-dark`) on legs, shoulders and biceps; every pairing clears 4.5:1.

### Neutral
- **Gym-Floor Rubber** (`rubber`): page ground and the weight input well; also `themeColor`.
- **Lifted Panel** (`panel`): every card (split, trend, log form, week list) and the loading skeletons.
- **Panel High** (`panel-high`): popovers (plate detail, date picker).
- **Track** (`track`): unfilled bars, missed tally marks, empty day squares, scrollbar thumb.
- **Hover Wash** (`hover`): hover fill on outline buttons, chips and list rows.
- **Outline** (`outline`) and **Hairline** (`outline-variant`): control borders, and card borders, dividers and gridlines respectively.
- **Bar Steel** (`steel`): the barbell shaft, collars and sleeves, the rim of an untagged gym-day plate, and the floor rule under the weekly stacks.
- **Chalk Variant / Chalk Subtle** (`chalk-variant`, `chalk-subtle`): secondary text and tertiary text (units, dates, tags).

### Exercise colours (data: a single exercise)
Every exercise in `src/lib/fit-exercises.ts` carries its own bright colour (`Exercise.color`, from `exerciseColor(i)`): OKLCH chroma 0.17, hue stepping by the golden angle (137.5°) and lightness cycling 0.82 / 0.72 / 0.9, so exercises of the same muscle group sit far apart and are easy to tell apart (user-approved, 2026-11-15). Text on an exercise colour is always Rubber (`EXERCISE_INK`). Use exercise colours only where one specific exercise is shown (set plates on the Log sleeve, the exercise picker swatch, exercise name chips, set chips). Anything about a muscle group keeps its plate colour.

### Food groups (data: what a food is)
Twelve muted kitchen tints colour the disc behind a food icon, one per food group: grains `#e8c27a`, dals `#d9a05b`, dairy `#efe6d2`, eggs `#f6dc7a`, meat & fish `#e08a6e`, veg `#8fcf7a`, fruit `#f49a8a`, nuts & seeds `#c49a74`, snacks `#e6b58f`, protein `#b9b4f0`, drinks `#8ec8e8`, sweets `#eda3c5` (`--food-*` in fit.css, `bg-food-*`). All take Rubber ink at ≥6.6:1. Food group colours appear only on food icon discs and the group dots in the Add-food filter (user-approved, 2026-11-15).

### Macro colours (data: the fuel plate)
The Food page's fuel plate and its tiles use one colour per measure: calories chalk `#f4f4f2`, protein violet `#b3a6ff`, carbs amber `#ffcf6e`, fiber mint `#7fe0a8` (`--macro-*` in fit.css). The app tracks fiber, not fat: fat is still stored per entry but never shown; the fiber target is 14 g per 1,000 kcal, at least 25 g. Each ring is labelled in its own colour along the curve, and the matching tile repeats the colour as a dot and fill bar. Used nowhere else (user-approved, 2026-11-15).

### Food icons
Every built-in food has an icon (`Food.icon` in `src/lib/fit-foods.ts`, drawn by `FoodIcon` in `src/components/fit/food-icon.tsx`): a lucide line icon, or one of the custom Indian staples (roti, rice, dosa, idli, samosa, shaker, bread, paneer) drawn on the same 24px grid with a 2px round stroke, in Rubber ink on its group-coloured disc. Custom and AI foods borrow the icon of the closest built-in (`guessFood`); unknown foods get a steel disc with a fork and knife.

### Named Rules
**The Plates Are Data Rule.** A plate colour appears only where it encodes a muscle group: a plate face, a split tile, a trained-muscle toggle, a muscle chip, a gym-day tick on the trend floor. Never on chrome, buttons, headings, borders or state. Exercise colours follow the same rule, at the level of one exercise.

**The Chalk Hand Rule.** Chalk is the one action colour. Primary buttons, active tabs, active toggles and focus are chalk on rubber; there is no accent hue to reach for.

**The Separate Gym Rule.** Bumper Plates never mixes with Midnight Lime. Progresshub lime (#c8f432) never appears in fit, and no fit token is imported into the main app.

## Typography

**Display Font:** Barlow Condensed (with Archivo, sans-serif), weights 500 to 800, via `next/font` as `--font-barlow`
**Body Font:** Archivo (with system-ui, sans-serif), weights 400 to 800, via `next/font` as `--font-archivo`

**Character:** Barlow Condensed is the stamp on the plate: tall, tight, tabular numerals for every weight, count and heading. Archivo is the plain gym-floor signage around it.

### Hierarchy
- **Display Hero** (`display-hero`, `display-hero-wide` from 640px): today's weight on Home, with the unit at 1.75rem to 2.25rem in Chalk Subtle. Also the 404 numeral at the wide size.
- **Display Input** (`display-input`): the typed weight in the log well.
- **Headline Stamp** (`headline-stamp`, `headline-stamp-wide`): uppercase page headlines ("Weigh in. / Load the bar."), with the second line in Chalk Subtle.
- **Title Stamp** (`title-stamp`): uppercase empty-state and 404 titles (2.25rem and 1.875rem).
- **Numerals** (`numeral-lg`, `numeral-md`, `numeral-sm`): trend readout, stat values and split-tile counts, section counts ("3 / 7 loaded"). The trailing unit or denominator is set smaller in Chalk Subtle.
- **Body** (`body`, `body-sm`): explanatory lines capped at 34ch; buttons, chips, tabs and row labels at 0.875rem semibold.
- **Label Rim** (`label-rim`): uppercase, 0.14em tracking, Chalk Variant. These are the section titles themselves ("This week", "Split · 30 days", "Trend · 90 days"), like the lettering on a plate rim, and the "Trained" legend.
- **Caption / Micro** (`caption`, `micro`): stat labels, dates, day initials (M T W T F S S) and week tags.

### Named Rules
**The Stamped Number Rule.** Every weight, count and streak is Barlow Condensed bold with tabular numerals; Archivo never sets a metric value.

**The Rim Label Rule.** A section's title is a single uppercase tracked rim label on the left, with its headline number in condensed numerals on the right, sharing one baseline. No second heading line above or below it.

## Layout

One centred column, max 640px, with 16px side padding (24px from 640px) and 48px bottom padding. The header is 64px: glyph and wordmark left, Home | Log tabs centre, a back-to-progresshub pill right (wordmark and pill label hide below 640px).

Home stacks its blocks with a 20px gap. Blocks alternate between open sections on the rubber (the bar, the weight, the weeks) and lifted panels (the split, the trend), so the page reads as floor and equipment rather than a card grid. Panels pad 16px, 20px from 640px. Stat rows are three equal cells between hairlines with vertical hairline dividers. Day strips are 7-column grids; weekly stacks an 8-column grid on a shared scale. The muscle grid is 3 columns (2 below 400px on Log).

## Elevation & Depth

Flat. There are no box shadows anywhere in the fit app. Depth is tonal: Rubber ground, Lifted Panel cards, Panel High popovers, each step bordered by a hairline. The only texture is the floor itself, a two-layer radial speckle (7px and 11px tiles) on the body. Plate tiles carry a 4px inset ring of 30% black to read as a moulded rim, not as elevation.

### Named Rules
**The Tonal Lift Rule.** A surface rises by one tonal step plus a hairline, never by a shadow or glow.

## Shapes

Two families. Controls are pills: every button, chip, tab group, unit toggle and tag is fully rounded. Containers are soft rectangles: cards and the weight well at 16px, muscle toggles, split tiles and list rows at 12px, day squares at 8px. Plates are the exception and keep near-square corners (3px faces, 2px in stacks and mini bars) because they are moulded rubber seen edge-on. Split tiles are full circles, the plate seen face-on. Base radius is 0.5rem; the scale derives from it.

## Components

### Buttons
- **Shape:** pill (`rounded.full`).
- **Primary:** Chalk fill, Rubber text, bold, 48px tall with 24px padding (`button-primary`); the log form's submit is full width and 56px (`button-submit`) and scales to 98% when pressed. Hover goes to Bare White, press to Worn Chalk.
- **Saving:** the submit keeps its label and shows "Saving…" beside a mini bar where three plate slivers keep sliding on (`plate-loop`).
- **Outline:** transparent with an Outline border, Chalk Variant text; hover adds the Hover Wash and Chalk text (`button-outline`). Used for secondary routes and the back-to-progresshub pill (40px).

### Chips
- **Style:** 40px pill, Outline border, Chalk Variant text (`chip`): the day pickers (Today, Yesterday, Pick date).
- **State:** active is a Chalk border with Chalk Dust fill and Chalk text (`chip-active`). The "due" tag on a split tile is a Chalk Dust micro pill (`chip-due`). Muscle chips in the plate popover take the plate fill and its ink.

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** Lifted Panel; popovers Panel High.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** one Hairline.
- **Internal Padding:** 16px, 20px from 640px; the week list uses 20px/24px with hairline dividers between its parts.

### Inputs / Fields
- **Style:** the weight well is an 80px Rubber field inside the Lifted Panel, 16px radius, Outline border, Display Input numerals, unit in condensed Chalk Subtle on the right with a micro "last 72.4" hint. Spin buttons are removed; the caret is chalk.
- **Focus:** the well's border turns Chalk on focus-within; elsewhere the global focus is a 2px Chalk outline offset 2px.
- **Error / Disabled:** errors are a plain caption line under the submit in Chalk Variant, announced politely. While saving, the well dims to 70% with a 60% Chalk border.

### Navigation
- **Style:** a pill-outlined tab group with 4px inset holding Home and Log (36px tabs, icon plus label, semibold). Active is a filled Chalk pill with Rubber text; inactive is Chalk Variant, Chalk on hover. The same treatment serves the kg | lb radio group at 28px.

### Muscle Toggle and Plate Tile
- **Muscle toggle** (`muscle-toggle`): 48px, 12px radius, Outline border with a small plate-coloured dot; when on, the whole toggle takes the plate fill and ink and the dot flips to the ink.
- **Plate tile** (`plate-tile`): a 48px plate-coloured circle holding the 30-day count in condensed numerals, a 30% black inset rim, then the group name and "3d ago". Zero counts fade to 35%. Tapping one sets a shared highlight: that tile gets a 2px Chalk outline, the others fade to 45%, and every plate that did not train that group fades to 20% across the bar and the weekly stacks.

### Barbell (signature)
A steel bar across the full width: a 10px shaft (6px in the mini bar), an 18% knurled centre, end caps, inner collars, and two sleeves loaded symmetrically, one plate per gym day, collar-outward in day order. Each plate is a vertical stack of one band per muscle trained, in plate colours; a gym day with no muscles tagged is a steel-rimmed training plate. On Home each plate is a button that opens a Panel High popover with the day, its muscle chips and the weight. An empty bar is the empty state and the 404, with the next action set over it. The mini bar (56px plates) sits under the log form and updates live as muscles are picked.

### Weekly Stacks and Tally
- **Weekly stacks:** eight columns of 15px plate faces on a 4px Steel floor rule, same scale every week, with the count above each column and "now" under the current week.
- **Weigh-in tally:** 30 rounded strokes, 24px tall, Chalk Variant when logged and Track when missed, a gap after every seventh, today ringed in Chalk.
- **Trend:** each weigh-in a 6px Chalk Subtle dot, the 7-day average a 2.5px Chalk line, gym days as plate-coloured ticks on the chart floor; drag or hover to scrub, with the readout in `numeral-lg`.

### Motion
Colour-free motion is shared from `src/app/motion.css` (`card-in` section entrance staggered by `--card-i`, `chart-reveal`, `chart-grow`, `chart-pop`). Fit's own grammar is plate loading: `plate-load` slides each plate down its sleeve from the outside over 0.7s on `cubic-bezier(0.2, 0.9, 0.25, 1)`, overshoots 6% and settles (the clank), staggered 110ms in load order after a 0.25s delay; it replays on a successful save, alongside an 18ms vibration where supported. All of it is removed under reduced motion.

### Food page
Top to bottom: a **week picker** (a panel with ‹ › week arrows around a date button that opens the calendar, plus a Today chip; below, Mon–Sun as calorie rings that fill toward the target and turn dashed when over, the picked day as a chalk disc that glides between days, today dotted, future days dimmed; swipe the row to change week), the **fuel plate** (a bumper-plate gauge: four labelled rings, calories, protein, carbs and fiber, each in its macro colour and sweeping 300° with its name in the gap; the hub counts kcal left, Dumbo reacts; four matching tiles below), and the **meal timeline** (a steel sleeve with one node per meal; collapsed meals show their foods as overlapping icon discs and a share-of-day bar; rows carry the food icon, swipe left on touch to reveal Delete; a new food drops in with a chalk flash). Add food is a Browse grid of icon tiles with group filter chips and a Recent row; the tapped tile's icon grows into the detail view.

### Sets and Recovery
The Sets pane has three parts: **Add a set** (muscle plate tiles; every exercise as a chip with its round photo in its exercise colour, plus "+ Add exercise" for your own; a preview card where the picked exercise's photo moves between its start and end frames; one row per set with its own reps and weight, "+ Add set" copies the row above, "Log N sets"; bodyweight exercises take optional "+kg", empty = BW), **Today's session** (sets / exercises / volume as large rolling numerals; the focal piece, `session-bar.tsx`: today's sets as a loaded barbell, each set a bumper plate mirrored on both sleeves in its exercise colour and as tall as the weight relative to today's heaviest, bodyweight sets slim; new plates slide on from the sleeve end with an overshoot and the bar shakes once; then sets grouped by exercise with photos and PR badges). Muscle tiles are plate faces (rim, hub, notch) that spin half a turn when picked; exercises are photo tiles (colour stripe, last result; the picked one's photo moves and a ring in its colour glides to it; six shown, "Show all" for the rest); set rows slide in and out. Exercise photos are from the public-domain free-exercise-db (`public/fit/exercises`, 360px WebP, two frames each); own exercises fall back to their muscle's plate colour. **Recovery** is a button beside "Log sets" (always shown) that opens a dialog for bedtime and wake-up time; it shows the hours live on a 6 pm → noon timeline and saves sleep only.

### Coach
The Coach page is Dumbo in his coach outfit (`outfit="coach"`: chalk cap with brim, whistle on a cord) with a speech line that follows the week, then two sections. **Training week** (`coach-week.tsx`): Mon–Sun cards (7 across, 4+3 on phones), muscle plates and names per day, Sunday always "Day off". "Generate this week's training" asks the AI (fallback: rule-based) for the open days using the profile's gym days; logged days win (a logged gym day shows what you trained, the old plan struck through when swapped), and when logs differ from the plan the button becomes a pulsing "Update the schedule" that re-plans only the remaining days with completed ones locked. **Meal prep** (`coach-meals.tsx`): eaten vs target for calories and protein, per-meal chips (logged ✓ / to plan), an ingredient chip input saved for the day, "Generate meal prep" for the meals not yet logged (only listed ingredients plus pantry basics), warnings beside a sore Dumbo when ingredients can't reach the targets, and dish cards with quantities, macros, steps and "Log this meal". Logic: `fit-coach-plan.ts`, `fit-coach-meals.ts`, AI prompts `fit-coach-ai.ts`; data in `coach_week_plans` and `coach_meal_preps`.

### Dumbo (mascot) and the load-the-bar flow

- **Dumbo the dumbbell** (`src/components/fit/dumbo.tsx`) is the app's one character: a steel capsule handle (the body, with the face) between two bumper-plate "arms". Inline SVG driven by `motion`, as a single state machine with one `mood` prop: idle, curious, thinking, happy, proud, flex, sad, sore, sleepy, shocked. Plates swing around their own centres; the body bobs, droops or bounces; he blinks every ~4 s.
- **Plate-tint rule:** Dumbo's plates take the colour of the muscle being talked about (the same IWF plate colours), steel otherwise. His face and effects stay in chalk/rubber; no other hues (tears, sweat, sparkles and blush are chalk).
- **Mood follows the goal**, never the raw direction: weight moving toward the goal (from the profile, else the flow's `fit_goal` cookie, else Maintain shown selected) is happy/flex; away is sad with an encouraging line; ±0.1 kg is flat; >2 kg is shocked ("double-check that?"). Logic and copy live in `src/lib/fit-mascot.ts`.
- **The flow** (`src/components/fit/log-flow.tsx`): lives inline at the top of the Log page (`inline` mode, a rubber-floor card), with `LogHistory` beside it (the **week rack**: a rim-labelled `n/7` headline, a Gym · Change · Streak stat strip, then a steel rail with one peg per day; each logged day hangs a face-on bumper plate sliced into the muscles trained (steel when untagged, rubber with a steel ring on rest days) with its weight under it, empty past pegs are dashed `+` circles, future ones faint; a chalk weigh-in trace wipes in above the rail; plates roll on with `plate-roll` staggered by weekday, the picked day lifts off its peg with a gliding chalk ring; then **Recent** as a weigh-in ladder: per row a date block (big day number, weekday or TODAY), a mini plate placed left-to-right by weight on a dotted rule and linked to the next row by a chalk line so the rows read as a trend, a ▲/▼ change pill and the weight; rows slide in staggered, links wipe down, the picked row gets a gliding highlight; tapping a day loads it into the flow at the weight step). One question per step (When → Weight → Gym → Muscles → Bar loaded), shared-axis slide + blur between steps, Dumbo and a speech bubble above each question; the finale offers Log sets and Log another day. There is no floating log button: every `OpenLogButton` links to the Log page. The Log page is two panes (`log-stage.tsx`): Weigh-in (heading, flow, history) and Sets. "Log sets" (beside the heading, or in the flow's finale) slides the whole weigh-in out to the left and the sets in from the right; "← Weigh-in" slides back. Both panes stay mounted, so nothing typed is lost. The dialog mode still exists for reuse.
- **Drop-in alerts** (muscle trained yesterday, twice/three times this week) land under the speech bubble with a plate-colour dot, never over Dumbo; he winces (sore) while it shows.
- **Motion:** `clank-shake` (a plate landing), chalk-confetti bursts on a good weigh-in and the finale, per-muscle tile moves (chest puff, back spread, shoulders press, biceps curl, triceps push-down, legs squat), the finale's full-size barbell with `plate-load`. `MotionConfig reducedMotion="user"` and `useReducedMotion` keep every step working as static poses when motion is reduced.

## Do's and Don'ts

### Do:
- **Do** encode every muscle group with its plate colour and its fixed ink from `PLATE` in `src/lib/fit-units.ts`; add new data views by reusing PlateFace rather than inventing a swatch.
- **Do** use Chalk for every action and active state: filled Chalk pill with Rubber text for primary, Outline pill for secondary.
- **Do** set every metric in Barlow Condensed bold with tabular numerals, the unit or denominator smaller in Chalk Subtle.
- **Do** title sections with one uppercase rim label (0.75rem, 700, 0.14em) left and the headline number right on one baseline.
- **Do** lift surfaces by tone and a hairline: Rubber, then Lifted Panel, then Panel High.
- **Do** keep the barbell as the empty state and let plates clank on after a save; respect reduced motion.

### Don't:
- **Don't** use a plate colour for chrome, buttons, headings, borders, focus or status.
- **Don't** use progresshub lime (#c8f432) or any Midnight Lime token in fit, and don't import `globals.css` into the fit tree.
- **Don't** add box shadows or glows; the system is flat.
- **Don't** set a weight or count in Archivo, or a page headline in anything but uppercase Barlow Condensed.
- **Don't** stack a second small label above a rim-label title.
- **Don't** colour direction: weight change is ▲ or ▼ in chalk, never red or green.
