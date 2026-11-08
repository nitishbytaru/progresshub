"use client";

import { Analytics, type BeforeSend } from "@vercel/analytics/next";

const OPT_OUT_KEY = "progresshub-analytics-off";

/** Visiting any page with ?analytics=off stops counting this browser; ?analytics=on resumes it. */
const skipOptedOut: BeforeSend = (event) => {
  try {
    const choice = new URL(event.url).searchParams.get("analytics");
    if (choice === "off") localStorage.setItem(OPT_OUT_KEY, "1");
    if (choice === "on") localStorage.removeItem(OPT_OUT_KEY);
    if (localStorage.getItem(OPT_OUT_KEY)) return null;
  } catch {
    // Storage blocked: count the visit as normal.
  }
  return event;
};

export function SiteAnalytics() {
  return <Analytics beforeSend={skipOptedOut} />;
}
