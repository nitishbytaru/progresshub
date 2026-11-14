/**
 * Loading frame for a public profile, in the final layout's shape. Each panel has a solid
 * lime scan line running along its top edge (an indeterminate progress bar), started a
 * beat apart so the page reads as loading top to bottom.
 */
export function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-6 lg:gap-8" aria-busy="true" aria-label="Loading profile">
      {/* Avatar, name, handle, X button */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="size-12 animate-pulse rounded-full bg-surface-highest sm:size-16" />
          <div className="flex flex-col gap-2">
            <div className="h-5 w-40 animate-pulse rounded bg-surface-highest sm:h-7 sm:w-56" />
            <div className="h-3.5 w-24 animate-pulse rounded bg-surface-highest" />
          </div>
        </div>
        <div className="h-10 w-24 animate-pulse rounded-lg bg-surface-highest sm:h-14 sm:w-44 sm:rounded-xl" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Block i={0} className="h-[150px] sm:h-[210px] lg:col-span-2">
          <Line w="w-24" />
          <Line w="w-32" h="h-9" />
          <Line w="w-full" h="h-2.5" />
        </Block>
        <Block i={1} className="h-[86px] sm:h-[210px]">
          <Line w="w-16" />
          <Line w="w-20" h="h-10" />
        </Block>
        <Block i={2} className="h-[300px] sm:h-[460px] lg:col-span-2">
          <Line w="w-48" h="h-5" />
        </Block>
        <Block i={3} className="h-[360px] sm:h-[460px]">
          <Line w="w-32" h="h-5" />
        </Block>
        <Block i={4} className="h-[420px] lg:col-span-3">
          <Line w="w-32" h="h-5" />
        </Block>
      </div>
    </div>
  );
}

function Block({ i, className, children }: { i: number; className: string; children: React.ReactNode }) {
  return (
    <div
      className={`skeleton-scan flex flex-col gap-4 rounded-2xl border border-hairline p-5 sm:p-6 ${className}`}
      style={{ "--scan-delay": `${i * 180}ms` } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

function Line({ w, h = "h-3.5" }: { w: string; h?: string }) {
  return <div className={`animate-pulse rounded bg-surface-highest ${w} ${h}`} />;
}
