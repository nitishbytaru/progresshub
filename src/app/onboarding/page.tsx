import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { getViewer } from "@/lib/data";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Set up your profile" };

async function FormWithDefaults() {
  const { profile } = await getViewer();
  return <OnboardingForm defaultName={profile.display_name} />;
}

export default function OnboardingPage() {
  return (
    <AuthShell title="Claim your spot" subtitle="Which X account are you growing to 500K?">
      <Suspense fallback={<div className="h-[300px]" aria-hidden />}>
        <FormWithDefaults />
      </Suspense>
    </AuthShell>
  );
}
