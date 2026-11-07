# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

X (Twitter) creators working toward 500K impressions. The main use is a quick daily check-in on a phone: log yesterday's impressions, see how the pace is going, then share or compare with other creators. A community layer sits on top: creators see each other on a public leaderboard and post their progress to X so they stay accountable in public.

## Product Purpose

progresshub turns a far-off goal (500K impressions) into a daily habit people can see. Users record their numbers, watch progress and pace build up, get a prediction of when they will reach 500K, and share milestones. Success means creators keep logging every day and reach 500K, helped along by public accountability.

## Positioning

One fixed, shared finish line (500K impressions) that every creator races toward in public. Because the goal is the same for everyone, the leaderboard and shared progress compare like with like, which a general analytics dashboard cannot do.

## Operating Context

- Daily routine: open X analytics, copy the numbers, enter them in progresshub. Usually done on a phone.
- Planned surfaces (Stitch project `progresshub`, id `8603136262068531449`): Main Dashboard, Add Daily Progress, Analytics & Predictions, Share on X modal, Public Leaderboard. Each has desktop and mobile variants.
- Sharing happens on X itself. The share flow should produce a post or card that looks good in an X feed.

## Capabilities and Constraints

- **Goal:** 500K impressions is fixed for every user. Users cannot set their own target.
- **Data entry:** manual only. There is no X API integration, so the product must never imply automatic sync.
- **Visibility:** profiles and progress are public by default and appear on the leaderboard. Whether users can opt out is undecided.
- **Backend:** Supabase for the database and auth.
- **Auth:** Google sign-in plus Supabase email auth.
- **Stack:** Next.js 16 (App Router), Tailwind v4, shadcn/ui.
- **Mobile-first:** design for the phone check-in first, then scale up to desktop.
- **Open:** what the prediction model is based on, the leaderboard ranking metric (total, pace, or streak), and how logging handles corrections or missed days.

## Brand Commitments

- The product name is **progresshub**, written in lowercase. Never use "ImpressionTrack", even though the old Stitch screen titles do.
- Visual system: the Midnight Lime palette in DESIGN.md, which the user has made binding. It uses only black `#0b0b0c`, white `#FFFFFF` and lime `#C8F432`, with no other hues and no red.

## Evidence on Hand

- Stitch screens and the app icon live in the Stitch project above.
- There are no real users, testimonials, leaderboard data or creator counts yet. Do not invent any. Sample data must be clearly labeled as sample data.

## Product Principles

1. **The daily log comes first.** Recording today's numbers must take seconds on a phone. Everything else follows from that.
2. **One finish line.** Every view relates back to 500K: how far along, how fast, and when.
3. **Public progress.** Visibility and sharing are part of the core loop, not extras.
4. **Honest numbers.** Data is entered by hand and predictions are estimates. Label them that way and never imply false precision or a live sync.
