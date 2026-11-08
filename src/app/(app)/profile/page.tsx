import type { Metadata } from "next";
import { Suspense } from "react";
import { Trash2 } from "lucide-react";
import { PageSkeleton } from "@/components/progress/page-skeleton";
import { DeleteAccountDialog } from "@/components/shell/delete-account-dialog";
import { getEntries, getViewer } from "@/lib/data";
import { ProfileForms } from "./profile-forms";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6 lg:gap-8">
      <h1 className="text-[1.75rem] leading-tight font-bold tracking-[-0.025em] sm:text-[2rem]">Profile</h1>
      <Suspense fallback={<PageSkeleton blocks={["h-[340px]", "h-[88px]"]} />}>
        <Profile />
      </Suspense>
    </div>
  );
}

async function Profile() {
  const { user, profile } = await getViewer();
  const logCount = (await getEntries(profile.id)).length;

  return (
    <>
      <ProfileForms email={user.email ?? ""} pendingEmail={user.new_email ?? null} handle={profile.handle ?? ""} />

      <section aria-label="Delete account" className="panel-dark flex items-center justify-between gap-4 rounded-2xl p-5 sm:p-6">
        <p className="text-sm text-muted-foreground">Erase your account and all your data.</p>
        <DeleteAccountDialog
          handle={profile.handle}
          logCount={logCount}
          trigger={
            <button
              type="button"
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-hover"
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
