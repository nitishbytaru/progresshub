import { LogOut, Trash2 } from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { getEntries, getViewer } from "@/lib/data";
import { Avatar } from "./brand";
import { DeleteAccountDialog } from "./delete-account-dialog";

/** Signed-in creator with sign-out and delete-account controls. `sidebar` for desktop, `avatar` for the mobile top bar. */
export async function UserMenu({ variant }: { variant: "sidebar" | "avatar" }) {
  const { profile, user } = await getViewer();
  const name = profile.display_name || profile.handle || user.email || "You";
  const logCount = (await getEntries(profile.id)).length;

  if (variant === "avatar") {
    return (
      <details className="relative">
        <summary className="list-none rounded-full [&::-webkit-details-marker]:hidden" aria-label="Account menu">
          <Avatar name={name} src={profile.avatar_url} />
        </summary>
        <div className="absolute top-full right-0 z-50 mt-2 w-56 rounded-xl border border-border bg-background p-2 shadow-[0_16px_40px_#000000cc]">
          <p className="truncate px-2 pt-1 text-sm font-semibold">{name}</p>
          {profile.handle && <p className="truncate px-2 font-mono text-xs text-subtle">@{profile.handle}</p>}
          <form action={signOut} className="mt-2 border-t border-hairline pt-2">
            <button className="flex h-9 w-full items-center gap-2 rounded-lg px-2 text-sm text-muted-foreground transition-colors hover:bg-hover hover:text-foreground">
              <LogOut className="size-4" /> Sign out
            </button>
          </form>
          <DeleteAccountDialog
            handle={profile.handle}
            logCount={logCount}
            trigger={
              <button
                type="button"
                className="flex h-9 w-full items-center gap-2 rounded-lg px-2 text-sm text-muted-foreground transition-colors hover:bg-hover hover:text-foreground"
              />
            }
            triggerLabel={
              <>
                <Trash2 className="size-4" /> Delete account
              </>
            }
          />
        </div>
      </details>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border p-2.5">
      <Avatar name={name} src={profile.avatar_url} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{name}</p>
        {profile.handle && <p className="truncate font-mono text-xs text-subtle">@{profile.handle}</p>}
      </div>
      <DeleteAccountDialog
        handle={profile.handle}
        logCount={logCount}
        trigger={
          <button
            type="button"
            aria-label="Delete account"
            title="Delete account"
            className="inline-flex size-8 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-hover hover:text-foreground"
          />
        }
        triggerLabel={<Trash2 className="size-4" />}
      />
      <form action={signOut}>
        <button
          aria-label="Sign out"
          title="Sign out"
          className="inline-flex size-8 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-hover hover:text-foreground"
        >
          <LogOut className="size-4" />
        </button>
      </form>
    </div>
  );
}
