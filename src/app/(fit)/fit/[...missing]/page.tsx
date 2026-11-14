import { notFound } from "next/navigation";

// This route only exists to throw notFound(), so there's no UI for instant-navigation validation to check.
export const instant = false;

/** Any fit.progresshub.space URL with no page renders the fit 404 inside the fit layout. */
export default function Missing() {
  notFound();
}
