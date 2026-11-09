import Link from "next/link";
import { Bot, LogOut, UserRound } from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { getViewer, isTelegramConnected } from "@/lib/data";
import { Avatar } from "./brand";
import { ClosingDetails } from "./nav";

/** Signed-in creator: links to the profile page and signs out. `sidebar` for desktop, `avatar` for the mobile top bar. */
export async function UserMenu({ variant }: { variant: "sidebar" | "avatar" }) {
  const { profile, user } = await getViewer();
  const name = profile.display_name || profile.handle || user.email || "You";

  if (variant === "avatar") {
    const connected = await isTelegramConnected();
    return (
      <ClosingDetails className="relative">
        <summary className="list-none rounded-full [&::-webkit-details-marker]:hidden" aria-label={connected ? "Account menu" : "Account menu, Telegram not connected"}>
          <span className="relative block">
            <Avatar name={name} src={profile.avatar_url} />
            {!connected && <span aria-hidden className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background bg-primary" />}
          </span>
        </summary>
        <div className="absolute top-full right-0 z-50 mt-2 w-56 rounded-xl border border-border bg-background p-2 shadow-[0_16px_40px_#000000cc]">
          <p className="truncate px-2 pt-1 text-sm font-semibold">{name}</p>
          {profile.handle && <p className="truncate px-2 font-mono text-xs text-subtle">@{profile.handle}</p>}
          <div className="mt-2 border-t border-hairline pt-2">
            <Link
              href="/profile"
              className="flex h-11 w-full items-center gap-2 rounded-lg px-2 text-sm text-muted-foreground transition-colors hover:bg-hover hover:text-foreground"
            >
              <UserRound className="size-4" /> Profile
            </Link>
            <Link
              href="/connect"
              className="flex h-11 w-full items-center gap-2 rounded-lg px-2 text-sm text-muted-foreground transition-colors hover:bg-hover hover:text-foreground"
            >
              <Bot className="size-4" />
              <span className="flex-1">Connect</span>
              {!connected && <span className="size-2 rounded-full bg-primary"><span className="sr-only">Telegram not connected</span></span>}
            </Link>
            <form action={signOut}>
              <button className="flex h-11 w-full items-center gap-2 rounded-lg px-2 text-sm text-muted-foreground transition-colors hover:bg-hover hover:text-foreground">
                <LogOut className="size-4" /> Sign out
              </button>
            </form>
          </div>
        </div>
      </ClosingDetails>
    );
  }

  return (
    <div className="flex items-center gap-1 rounded-xl border border-border p-1.5">
      <Link
        href="/profile"
        title="Profile"
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 transition-colors hover:bg-hover"
      >
        <Avatar name={name} src={profile.avatar_url} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{name}</span>
          {profile.handle && <span className="block truncate font-mono text-xs text-subtle">@{profile.handle}</span>}
        </span>
      </Link>
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
