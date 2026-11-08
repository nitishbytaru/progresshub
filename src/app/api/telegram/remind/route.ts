import { Api, InlineKeyboard } from "grammy";
import { db, siteOrigin, todayIn } from "@/lib/telegram/data";

/**
 * Daily reminder (Vercel Cron, see vercel.json): messages every linked creator with reminders on
 * who hasn't logged their own "today" yet. Also prunes old Telegram update ids.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return new Response("TELEGRAM_BOT_TOKEN is not set", { status: 500 });

  const client = db();
  const { data: links, error } = await client.from("telegram_links").select("user_id, chat_id, tz").eq("remind", true);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Who already logged their local today? (At most a couple of distinct dates across time zones.)
  const todays = new Map((links ?? []).map((l) => [l.user_id as string, todayIn(l.tz as string)]));
  const { data: logged } = todays.size
    ? await client
        .from("progress_entries")
        .select("user_id, entry_date")
        .in("user_id", [...todays.keys()])
        .in("entry_date", [...new Set(todays.values())])
    : { data: [] };
  const done = new Set((logged ?? []).filter((r) => todays.get(r.user_id) === r.entry_date).map((r) => r.user_id));

  const api = new Api(token);
  const keyboard = new InlineKeyboard().url("🌐 Open progresshub", `${siteOrigin()}/progress`);
  let sent = 0;
  for (const link of links ?? []) {
    if (done.has(link.user_id)) continue;
    try {
      await api.sendMessage(
        link.chat_id,
        "👋 Hey, you haven't updated today's progress yet.\n\nJust reply here with your total, like <b>28,400</b>, or what you added, like <b>+1,200</b>. Or update it on the website.",
        { parse_mode: "HTML", reply_markup: keyboard },
      );
      sent++;
    } catch (e) {
      // 403 = the creator blocked the bot: stop reminding them.
      if (e instanceof Error && /403|blocked/i.test(e.message)) {
        await client.from("telegram_links").update({ remind: false }).eq("user_id", link.user_id);
      }
    }
    await new Promise((r) => setTimeout(r, 40)); // stay well under Telegram's ~30 msg/s
  }

  await client.from("telegram_updates").delete().lt("seen_at", new Date(Date.now() - 2 * 86_400_000).toISOString());
  return Response.json({ linked: links?.length ?? 0, reminded: sent });
}
