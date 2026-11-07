import type { MetadataRoute } from "next";

/** Public creator pages and their share cards are crawlable (X needs them for link previews); the app is not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/u/", "/login"],
        disallow: ["/progress", "/analytics", "/leaderboard", "/onboarding", "/auth/"],
      },
    ],
  };
}
