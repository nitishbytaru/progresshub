import "server-only";
import { db, hashToken } from "../telegram/data";

/** The WhatsApp link tables, through the service-role client and always filtered to one user or number. */

export type WaLink = { user_id: string; wa_id: string; tz: string; remind: boolean };

export async function getLink(waId: string): Promise<WaLink | null> {
  const { data } = await db().from("whatsapp_links").select("user_id, wa_id, tz, remind").eq("wa_id", waId).maybeSingle<WaLink>();
  return data ?? null;
}

/** Redeems a one-time connect code from the website. Returns the linked handle, or null if invalid/expired. */
export async function redeemLinkToken(token: string, waId: string): Promise<{ handle: string | null } | null> {
  const client = db();
  const hash = hashToken(token);
  const { data: row } = await client
    .from("whatsapp_link_tokens")
    .select("user_id, tz, expires_at")
    .eq("token_hash", hash)
    .maybeSingle<{ user_id: string; tz: string; expires_at: string }>();
  if (!row || new Date(row.expires_at).getTime() < Date.now()) return null;

  // One number per account and one account per number: clear any older link for this number first.
  await client.from("whatsapp_links").delete().eq("wa_id", waId).neq("user_id", row.user_id);
  const { error } = await client
    .from("whatsapp_links")
    .upsert({ user_id: row.user_id, wa_id: waId, tz: row.tz, linked_at: new Date().toISOString() }, { onConflict: "user_id" });
  await client.from("whatsapp_link_tokens").delete().eq("token_hash", hash);
  if (error) return null;

  const { data: profile } = await client.from("profiles").select("handle").eq("id", row.user_id).maybeSingle<{ handle: string | null }>();
  return { handle: profile?.handle ?? null };
}

export async function unlink(waId: string) {
  await db().from("whatsapp_links").delete().eq("wa_id", waId);
}

export async function stopReminders(waId: string) {
  await db().from("whatsapp_links").update({ remind: false }).eq("wa_id", waId);
}

/** True the first time a message id is seen (Meta retries webhooks). Throws if the check itself fails. */
export async function firstTimeSeen(messageId: string) {
  const { error } = await db().from("whatsapp_messages").insert({ message_id: messageId });
  if (!error) return true;
  if (error.code === "23505") return false; // duplicate primary key: already handled
  throw new Error(`whatsapp dedupe failed: ${error.message}`);
}
