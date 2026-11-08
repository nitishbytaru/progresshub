import { Brand } from "./brand";

type Props = {
  /** Big mono code, e.g. "404" or "500". */
  code: string;
  title: string;
  message: string;
  /** Buttons/links, primary first. */
  actions: React.ReactNode;
  /** Tiny mono tag under the actions, e.g. an error reference. */
  detail?: string;
  /** `page`: full screen with the brand header (outside the app shell). `inline`: inside the shell. */
  variant?: "page" | "inline";
};

/**
 * Shared look for 404s and errors: the road to 500K, broken. A lime run that stops,
 * a dashed gap, and the code in lime. Server-safe, so error boundaries can use it too.
 */
export function StatusScreen({ code, title, message, actions, detail, variant = "page" }: Props) {
  const body = (
    <div className="mx-auto flex w-full max-w-[560px] flex-col items-center text-center">
      <p className="font-mono text-[5.5rem] leading-none font-semibold tracking-[-0.06em] text-primary sm:text-[7rem]" aria-hidden>
        {code}
      </p>

      {/* The broken track */}
      <div className="mt-6 flex w-full max-w-[360px] items-center gap-1.5" aria-hidden>
        <span className="h-2 flex-[3] rounded-full bg-primary" />
        <span className="size-2 shrink-0 rotate-45 border border-primary" />
        <span className="h-2 flex-[4] rounded-full border border-dashed border-foreground/30" />
        <span className="font-mono text-[11px] text-subtle">500K</span>
      </div>

      <h1 className="mt-8 text-2xl font-bold tracking-[-0.02em] text-balance sm:text-[1.75rem]">{title}</h1>
      <p className="mt-2 max-w-[44ch] text-sm text-pretty text-muted-foreground">{message}</p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-2">{actions}</div>
      {detail && <p className="mt-6 font-mono text-[11px] text-subtle">{detail}</p>}
    </div>
  );

  if (variant === "inline") return <div className="flex min-h-[60dvh] items-center justify-center py-10">{body}</div>;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-hairline">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center px-4 sm:px-6">
          <Brand />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-16">{body}</main>
    </div>
  );
}

/** Lime primary and outline secondary action styles, shared by every status page. */
export const statusAction = {
  primary:
    "inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover active:bg-primary-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
  secondary:
    "inline-flex h-11 items-center gap-2 rounded-lg border border-border px-5 text-sm font-semibold text-foreground transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
} as const;

