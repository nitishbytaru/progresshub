import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/progress/page-skeleton";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { TelegramCard } from "../profile/telegram-card";
import { WhatsAppVoteCard } from "../profile/whatsapp-vote-card";

export const metadata: Metadata = { title: "Connect" };

export default function ConnectPage() {
  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-4 sm:gap-6 lg:gap-8">
      <header className="max-sm:absolute">
        <h1 className="sr-only sm:not-sr-only text-[1.75rem] leading-tight font-bold tracking-[-0.025em] sm:text-[2rem]">Connect</h1>
        <p className="mt-1 hidden text-sm text-muted-foreground sm:block">Log from your chat app and get nudged on missed days.</p>
      </header>
      <Suspense fallback={<PageSkeleton blocks={["h-[290px]", "h-[250px]"]} />}>
        <Bots />
      </Suspense>
    </div>
  );
}

/** Everyone's votes. Needs the service role because each creator can only read their own row. */
async function countWhatsAppVotes() {
  try {
    const { count } = await createAdminClient().from("whatsapp_votes").select("user_id", { count: "exact", head: true });
    return count ?? 0;
  } catch {
    return 0; // the rest of the page still loads
  }
}

async function Bots() {
  const supabase = await createClient();
  const [{ data: telegram }, { data: whatsappVote }, whatsappVotes] = await Promise.all([
    // Missing table (migration not run yet) just reads as "not linked".
    supabase.from("telegram_links").select("remind, linked_at").maybeSingle<{ remind: boolean; linked_at: string }>(),
    supabase.from("whatsapp_votes").select("user_id").maybeSingle(),
    countWhatsAppVotes(),
  ]);

  return (
    <>
      <TelegramCard
        link={telegram ? { remind: telegram.remind, linkedAt: telegram.linked_at } : null}
        botUsername={process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? null}
      />
      <WhatsAppVoteCard voted={Boolean(whatsappVote)} votes={whatsappVotes} />
    </>
  );
}
