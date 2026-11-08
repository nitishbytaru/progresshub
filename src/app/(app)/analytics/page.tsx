import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/progress/page-skeleton";
import { getProgress } from "@/lib/data";
import { AnalyticsView } from "./analytics-view";

export const metadata: Metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<PageSkeleton blocks={["h-[72px]", "h-[480px]", "h-[420px]"]} />}>
      <Analytics />
    </Suspense>
  );
}

async function Analytics() {
  return <AnalyticsView p={await getProgress()} />;
}
