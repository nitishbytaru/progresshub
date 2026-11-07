import { BrandMark } from "@/components/shell/brand";

/** Centered single-column frame for sign-in, onboarding and password screens. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex items-center gap-2.5">
          <BrandMark />
          <span className="text-[17px] font-bold tracking-[-0.02em]">progresshub</span>
        </div>
        <h1 className="text-[1.75rem] leading-tight font-bold tracking-[-0.025em]">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}

export function Field({
  label,
  hint,
  ...props
}: React.ComponentProps<"input"> & { label: string; hint?: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="flex items-baseline justify-between text-sm font-medium">
        {label}
        {hint}
      </span>
      <input
        {...props}
        className="h-12 rounded-xl border border-border bg-background px-4 text-[15px] text-foreground transition-colors outline-none placeholder:text-subtle focus-visible:border-primary focus-visible:outline-none"
      />
    </label>
  );
}

export function FormNotice({ tone, children }: { tone: "error" | "info"; children: React.ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={
        tone === "error"
          ? "rounded-xl border border-foreground/40 px-4 py-3 text-sm font-medium"
          : "rounded-xl border border-primary/50 bg-primary-soft px-4 py-3 text-sm"
      }
    >
      {children}
    </p>
  );
}

export function SubmitButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover active:bg-primary-pressed disabled:opacity-60"
    >
      {pending && (
        <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
      )}
      {children}
    </button>
  );
}
