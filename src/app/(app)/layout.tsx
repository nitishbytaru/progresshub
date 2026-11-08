import { Suspense } from "react";
import { Brand, BrandMark } from "@/components/shell/brand";
import { BottomNav, MobileTitle, SidebarNav } from "@/components/shell/nav";
import { UserMenu } from "@/components/shell/user-menu";
import { Tour } from "@/components/tour/tour";
import { getProgress, getToday, isTelegramConnected, shouldAutoStartTour } from "@/lib/data";
import { fmt, fmtDate, fmtPct } from "@/lib/format";
import { GOAL } from "@/lib/progress";

async function GoalMini() {
  const { latest } = await getProgress();
  const total = latest?.total ?? 0;
  const pct = (total / GOAL) * 100;
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">Goal</span>
        <span className="font-mono font-semibold text-primary">{fmtPct(pct)}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-highest">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <div className="mt-2 flex justify-between font-mono text-xs">
        <span className="text-foreground">{fmt(total)}</span>
        <span className="text-subtle">{fmt(GOAL)}</span>
      </div>
    </div>
  );
}

async function TodayLabel() {
  const today = await getToday();
  return <time dateTime={today}>{fmtDate(today)}</time>;
}

async function SidebarBottomNav() {
  return <SidebarNav section="bottom" connectBadge={!(await isTelegramConnected())} />;
}

async function PhoneNav() {
  return <BottomNav connectBadge={!(await isTelegramConnected())} />;
}

async function TourGate() {
  return <Tour autoStartFor={await shouldAutoStartTour()} />;
}

const Placeholder = ({ className }: { className: string }) => (
  <div aria-hidden className={`animate-pulse rounded-xl border border-hairline ${className}`} />
);

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col justify-between border-r border-hairline bg-sidebar p-4 lg:flex">
        <div className="flex flex-col gap-6">
          <div className="px-1 pt-1">
            <Brand />
          </div>
          <Suspense fallback={<Placeholder className="h-[86px]" />}>
            <GoalMini />
          </Suspense>
          <SidebarNav section="main" />
        </div>
        <div className="flex flex-col gap-3">
          <Suspense fallback={<SidebarNav section="bottom" />}>
            <SidebarBottomNav />
          </Suspense>
          <Suspense fallback={<Placeholder className="h-[54px]" />}>
            <UserMenu variant="sidebar" />
          </Suspense>
        </div>
      </aside>

      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-hairline bg-background/90 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6 lg:h-16 lg:px-8">
          <div className="flex items-center gap-2.5 lg:hidden">
            <BrandMark className="size-7" />
            <div className="flex flex-col leading-tight">
              <span className="text-[15px] font-bold tracking-[-0.02em]">progresshub</span>
              <MobileTitle />
            </div>
          </div>
          <p className="hidden font-mono text-xs text-muted-foreground lg:block">
            <Suspense fallback={<span>&nbsp;</span>}>
              <TodayLabel />
            </Suspense>
          </p>
          <div className="lg:hidden">
            <Suspense fallback={<span className="block size-8 rounded-full border border-hairline" />}>
              <UserMenu variant="avatar" />
            </Suspense>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1200px] px-4 pt-6 pb-28 sm:px-6 lg:px-8 lg:pt-8 lg:pb-16">
        {children}
      </main>

      <Suspense fallback={<BottomNav />}>
        <PhoneNav />
      </Suspense>

      <Suspense fallback={null}>
        <TourGate />
      </Suspense>
    </div>
  );
}
