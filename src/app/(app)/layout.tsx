import { Brand, BrandMark, Initials, SampleBadge } from "@/components/shell/brand";
import { BottomNav, MobileTitle, SidebarNav } from "@/components/shell/nav";
import { fmt, fmtDate, fmtPct } from "@/lib/format";
import { getProgress } from "@/lib/data";
import { GOAL } from "@/lib/progress";
import { IS_SAMPLE, currentUser } from "@/lib/sample-data";

export default function AppLayout({ children }: LayoutProps<"/">) {
  const { latest, today } = getProgress();
  const pct = (latest.total / GOAL) * 100;

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col justify-between border-r border-hairline bg-sidebar p-4 lg:flex">
        <div className="flex flex-col gap-6">
          <div className="px-1 pt-1">
            <Brand />
          </div>

          <div className="rounded-xl border border-hairline bg-surface-low p-3">
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-muted-foreground">Goal</span>
              <span className="font-mono font-semibold text-primary">{fmtPct(pct)}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-highest">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <div className="mt-2 flex justify-between font-mono text-xs">
              <span className="text-foreground">{fmt(latest.total)}</span>
              <span className="text-subtle">{fmt(GOAL)}</span>
            </div>
          </div>

          <SidebarNav />
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-hairline bg-surface-low p-2.5">
          <Initials name={currentUser.name} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{currentUser.name}</p>
            <p className="truncate font-mono text-xs text-subtle">@{currentUser.handle}</p>
          </div>
        </div>
      </aside>

      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-hairline bg-background/85 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6 lg:h-16 lg:px-8">
          <div className="flex items-center gap-2.5 lg:hidden">
            <BrandMark className="size-7" />
            <div className="flex flex-col leading-tight">
              <span className="text-[15px] font-bold tracking-[-0.02em]">progresshub</span>
              <MobileTitle />
            </div>
          </div>
          <p className="hidden font-mono text-xs text-muted-foreground lg:block">
            <time dateTime={today}>{fmtDate(today)}</time>
          </p>
          <div className="flex items-center gap-3">
            {IS_SAMPLE && <SampleBadge />}
            <Initials name={currentUser.name} className="lg:hidden" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1200px] px-4 pt-6 pb-28 sm:px-6 lg:px-8 lg:pt-8 lg:pb-16">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
