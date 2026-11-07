import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthForm } from "./auth-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <AuthShell title="Race to 500K impressions" subtitle="Log your X impressions daily and see when you'll hit 500K.">
      <Suspense fallback={<div className="h-[420px]" aria-hidden />}>
        <AuthForm />
      </Suspense>
    </AuthShell>
  );
}
