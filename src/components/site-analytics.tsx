"use client";

import Script from "next/script";
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

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
// Production only, so local testing is never counted. The format check keeps the inline script safe.
const gaEnabled = process.env.NODE_ENV === "production" && Boolean(GA_ID && /^G-[A-Z0-9]+$/.test(GA_ID));

// Google's opt-out flag has to be set before its script reads the queued config.
const gaSetup = `
try {
  var choice = new URLSearchParams(location.search).get("analytics");
  if (choice === "off") localStorage.setItem("${OPT_OUT_KEY}", "1");
  if (choice === "on") localStorage.removeItem("${OPT_OUT_KEY}");
  if (localStorage.getItem("${OPT_OUT_KEY}")) window["ga-disable-${GA_ID}"] = true;
} catch (e) {}
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag("js", new Date());
gtag("config", "${GA_ID}");
`;

export function SiteAnalytics() {
  return (
    <>
      <Analytics beforeSend={skipOptedOut} />
      {gaEnabled && (
        <>
          <Script id="ga-setup">{gaSetup}</Script>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
        </>
      )}
    </>
  );
}
