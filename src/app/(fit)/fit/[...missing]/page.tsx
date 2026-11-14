import { notFound } from "next/navigation";

/** Any fit.progresshub.space URL with no page renders the fit 404 inside the fit layout. */
export default function Missing() {
  notFound();
}
