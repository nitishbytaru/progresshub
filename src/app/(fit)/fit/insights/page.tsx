import { redirect } from "next/navigation";

/** Insights now live on Home; keep old links and bookmarks working. */
export default function InsightsPage() {
  redirect("/");
}
