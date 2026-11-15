import type { Metadata } from "next";
import { Suspense } from "react";
import { LogOut } from "lucide-react";
import { signOut } from "@/app/(main)/auth/actions";
import { NotReady } from "@/components/fit/setup-notice";
import { getProfile, getUnit, getWeights, trainerReady } from "@/lib/fit";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Me" };

export default function MePage() {
  return (
    <>
      <h1 className="pt-6 pb-6 font-display text-5xl leading-[0.9] font-bold uppercase sm:pt-10 sm:text-6xl">
        Your <span className="text-ink-subtle">profile</span>
      </h1>
      <Suspense fallback={<div className="h-[520px] animate-pulse rounded-2xl bg-surface" aria-hidden />}>
        <Profile />
      </Suspense>
      <form action={signOut} className="mt-10 flex border-t border-outline-variant pt-6">
        <button
          type="submit"
          className="inline-flex h-12 items-center gap-2 rounded-full border border-outline px-6 text-base font-semibold text-ink-variant transition-colors hover:bg-hover hover:text-ink"
        >
          <LogOut className="size-4" aria-hidden />
          Log out
        </button>
      </form>
    </>
  );
}

async function Profile() {
  const [ready, profile, { today, logs }, unit] = await Promise.all([trainerReady(), getProfile(), getWeights(30), getUnit()]);
  if (!ready) return <NotReady feature="profile" />;
  return <ProfileForm profile={profile} latestKg={logs[0]?.kg ?? null} today={today} unit={unit} />;
}
