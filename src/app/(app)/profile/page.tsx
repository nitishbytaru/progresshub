import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowUpRight, Trash2 } from "lucide-react";
import { PageSkeleton } from "@/components/progress/page-skeleton";
import { Avatar } from "@/components/shell/brand";
import { DeleteAccountDialog } from "@/components/shell/delete-account-dialog";
import { getProgress, getViewer } from "@/lib/data";
import { fmt, fmtCompact, fmtDate, fmtPct } from "@/lib/format";
import { GOAL } from "@/lib/progress";
import { ProfileForms } from "./profile-forms";
import { SignInMethods, type Login } from "./sign-in-methods";
import { TelegramCard } from "./telegram-card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage({ searchParams }: PageProps<"/profile">) {
  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6 lg:gap-8">
      <h1 className="text-[1.75rem] leading-tight font-bold tracking-[-0.025em] sm:text-[2rem]">Profile</h1>
      <Suspense fallback={<PageSkeleton blocks={["h-[200px]", "h-[300px]", "h-[88px]"]} />}>
        <Profile searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Profile({ searchParams }: { searchParams: PageProps<"/profile">["searchParams"] }) {
  const supabase = await createClient();
  const [{ user }, p, query, { data: telegram }] = await Promise.all([
    getViewer(),
    getProgress(),
    searchParams,
    // Missing table (migration not run yet) just reads as "not linked".
    supabase.from("telegram_links").select("remind, linked_at").maybeSingle<{ remind: boolean; linked_at: string }>(),
  ]);
  // Set by /auth/callback when connecting another Google account fails.
  const linkError = typeof query.error === "string" ? query.error : null;
  const { profile } = p;
  const name = profile.display_name || profile.handle || user.email || "You";
  const total = p.latest?.total ?? 0;
  const pct = Math.min((total / GOAL) * 100, 100);
  const logins: Login[] = (user.identities ?? []).map((i) => ({
    id: i.identity_id,
    provider: i.provider,
    email: typeof i.identity_data?.email === "string" ? i.identity_data.email : null,
  }));
  const hasPassword = logins.some((l) => l.provider === "email") || user.user_metadata?.has_password === true;
  const googleOnly = !hasPassword && logins.length > 0 && logins.every((l) => l.provider === "google");
  const stats = [
    { label: "logs", value: fmt(p.rows.length) },
    { label: "streak", value: `${p.streak}d` },
    { label: "to 500K", value: fmtPct(pct) },
  ];

  return (
    <>
      {/* Who you are: avatar, handle and a glance at your numbers */}
      <section aria-label="Your account" className="panel-dark overflow-hidden rounded-2xl">
        <div className="flex items-center gap-4 p-5 sm:p-6">
          <Avatar
            name={name}
            src={profile.avatar_url}
            className="size-16 border-2 border-primary text-lg ring-4 ring-primary-soft"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold tracking-[-0.015em]">{name}</p>
            {profile.handle && <p className="truncate font-mono text-sm text-primary">@{profile.handle}</p>}
            <p className="mt-0.5 text-xs text-subtle">Member since {fmtDate(user.created_at.slice(0, 10))}</p>
          </div>
          {profile.handle && profile.is_public && (
            <Link
              href={`/u/${profile.handle}`}
              className="hidden shrink-0 items-center gap-1 rounded-lg border border-primary/40 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary-soft sm:inline-flex"
            >
              Public page <ArrowUpRight className="size-3.5" />
            </Link>
          )}
        </div>

        <dl className="grid grid-cols-3 divide-x divide-hairline border-t border-hairline">
          {stats.map((s) => (
            <div key={s.label} className="px-5 py-3.5 sm:px-6">
              <dd className="font-mono text-xl leading-none font-semibold tracking-[-0.03em] text-primary">{s.value}</dd>
              <dt className="mt-1 text-xs text-muted-foreground">{s.label}</dt>
            </div>
          ))}
        </dl>
        <div className="h-1 bg-surface-highest" role="img" aria-label={`${fmtCompact(total)} of 500K`}>
          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
      </section>

      <ProfileForms
        email={user.email ?? ""}
        pendingEmail={user.new_email ?? null}
        handle={profile.handle ?? ""}
        googleOnly={googleOnly}
      />

      <TelegramCard
        link={telegram ? { remind: telegram.remind, linkedAt: telegram.linked_at } : null}
        botUsername={process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? null}
      />

      <SignInMethods logins={logins} hasPassword={hasPassword} accountEmail={user.email ?? ""} linkError={linkError} />

      <section
        aria-label="Delete account"
        className="flex items-center justify-between gap-4 rounded-2xl border border-danger/40 bg-danger-soft p-5 sm:p-6"
      >
        <p className="text-sm text-foreground">Erase your account and all your data.</p>
        <DeleteAccountDialog
          handle={profile.handle}
          logCount={p.rows.length}
          trigger={
            <button
              type="button"
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg bg-danger px-4 text-sm font-semibold text-white transition-colors hover:bg-danger-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
            />
          }
          triggerLabel={
            <>
              <Trash2 className="size-4" /> Delete account
            </>
          }
        />
      </section>
    </>
  );
}
