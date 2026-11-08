import { db, todayIn } from "@/lib/telegram/data";
import { sendTemplate } from "@/lib/whatsapp/api";

/**
 * Daily reminder (Vercel Cron, see vercel.json): messages every linked creator with reminders on
 * who hasn't logged their own "today" yet. WhatsApp only allows an approved template outside the
 * 24-hour window, so the wording lives in the template named by WHATSAPP_REMINDER_TEMPLATE.
 * Also prunes old message ids.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const template = process.env.WHATSAPP_REMINDER_TEMPLATE;
  if (!template) return new Response("WHATSAPP_REMINDER_TEMPLATE is not set", { status: 500 });
  const language = process.env.WHATSAPP_REMINDER_TEMPLATE_LANG ?? "en";

  const client = db();
  const { data: links, error } = await client.from("whatsapp_links").select("user_id, wa_id, tz").eq("remind", true);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const todays = new Map((links ?? []).map((l) => [l.user_id as string, todayIn(l.tz as string)]));
  const { data: logged } = todays.size
    ? await client
        .from("progress_entries")
        .select("user_id, entry_date")
        .in("user_id", [...todays.keys()])
        .in("entry_date", [...new Set(todays.values())])
    : { data: [] };
  const done = new Set((logged ?? []).filter((r) => todays.get(r.user_id) === r.entry_date).map((r) => r.user_id));

  let sent = 0;
  let failed = 0;
  for (const link of links ?? []) {
    if (done.has(link.user_id)) continue;
    try {
      await sendTemplate(link.wa_id, template, language);
      sent++;
    } catch (e) {
      failed++;
      console.error("whatsapp reminder failed", e);
    }
    await new Promise((r) => setTimeout(r, 40));
  }

  await client.from("whatsapp_messages").delete().lt("seen_at", new Date(Date.now() - 2 * 86_400_000).toISOString());
  return Response.json({ linked: links?.length ?? 0, reminded: sent, failed });
}
