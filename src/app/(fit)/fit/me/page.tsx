import type { Metadata } from "next";
import { Suspense, type CSSProperties } from "react";
import { NotReady } from "@/components/fit/setup-notice";
import { getFitDataCounts, getProfile, getUnit, getWeights, trainerReady } from "@/lib/fit";
import { createClient } from "@/lib/supabase/server";
import { ClearFitData } from "./clear-data";
import { FitTelegram } from "./telegram";
import { ProfileForm } from "./profile-form";
import { SignOutButton } from "./sign-out";

export const metadata: Metadata = { title: "Me" };

export default function MePage() {
  // Clear data + log out: a separate Account section under the profile.
  const account = (
    <div className="flex flex-col gap-4">
      <Suspense fallback={<div className="h-[130px] animate-pulse rounded-2xl bg-surface" aria-hidden />}>
        <TelegramLink />
      </Suspense>
      <Suspense fallback={<div className="h-[170px] animate-pulse rounded-2xl bg-surface" aria-hidden />}>
        <ClearData />
      </Suspense>
      <SignOutButton />
    </div>
  );
  return (
    <>
      <h1
        className="card-in pt-6 pb-6 font-display text-5xl leading-[0.9] font-bold uppercase sm:pt-10 sm:text-6xl"
        style={{ "--card-i": 0 } as CSSProperties}
      >
        Your <span className="text-ink-subtle">profile</span>
      </h1>
      <Suspense fallback={<div className="h-[520px] animate-pulse rounded-2xl bg-surface" aria-hidden />}>
        <Profile account={account} />
      </Suspense>
    </>
  );
}

async function Profile({ account }: { account: React.ReactNode }) {
  const [ready, profile, { today, logs }, unit] = await Promise.all([trainerReady(), getProfile(), getWeights(30), getUnit()]);
  if (!ready)
    return (
      <div className="flex flex-col gap-6">
        <NotReady feature="profile" />
        {account}
      </div>
    );
  return <ProfileForm profile={profile} latestKg={logs[0]?.kg ?? null} today={today} unit={unit} account={account} />;
}

async function ClearData() {
  return <ClearFitData counts={await getFitDataCounts()} />;
}

async function TelegramLink() {
  const supabase = await createClient();
  const { data } = await supabase.from("fit_telegram_links").select("linked_at").maybeSingle();
  return <FitTelegram linkedAt={(data?.linked_at as string | undefined) ?? null} botUsername={process.env.NEXT_PUBLIC_TELEGRAM_FIT_BOT_USERNAME ?? null} />;
}
