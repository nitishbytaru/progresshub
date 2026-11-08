import Link from "next/link";
import { StatusScreen, statusAction } from "@/components/shell/status-screen";

/** /u/<handle> for a handle that isn't on progresshub, or whose profile is private. */
export default function CreatorNotFound() {
  return (
    <StatusScreen
      code="404"
      title="No creator by that name"
      message="This creator isn't on progresshub yet, or their profile is private. Check the @handle in the link."
      actions={
        <>
          <Link href="/login" className={statusAction.primary}>
            Track your own
          </Link>
          <Link href="/leaderboard" className={statusAction.secondary}>
            Browse creators
          </Link>
        </>
      }
    />
  );
}
