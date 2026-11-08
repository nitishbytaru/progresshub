import "server-only";
import { Bot, InlineKeyboard, type Context } from "grammy";
import { saveEntryFor } from "../entries";
import { fmt, fmtCompact, fmtDate, fmtDateShort, fmtPct, fmtSigned } from "../format";
import { addDays, GOAL, MILESTONE_STEP, milestoneCrossed, toUTC } from "../progress";
import { buildShareCard, reachedMilestones, type ShareKind } from "../share-cards";
import { validateEntry } from "../validation";
import { db, getLinkByChat, loadCreator, redeemLinkToken, siteOrigin, todayIn, unlinkChat, type Creator, type Link } from "./data";
import { extractWithGroq } from "./groq";
import { parseLogMessage } from "./parse";

/**
 * The progresshub Telegram bot: link an account, log a day in plain words (code parser first,
 * Groq as fallback, always confirmed with a button), and a button menu of stats, each with
 * "Post on X" and "Copy link" so every answer can be shared.
 */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const html = { parse_mode: "HTML" as const, link_preview_options: { is_disabled: true } };

const MENU = () =>
  new InlineKeyboard()
    .text("📝 Log today", "m:log")
    .text("📈 My progress", "m:progress")
    .row()
    .text("🏆 My rank", "m:rank")
    .text("🔥 Streak", "m:streak")
    .row()
    .text("🎯 Milestones", "m:milestones")
    .text("🔗 Share on X", "m:share");

const SHARE_LABELS: Partial<Record<ShareKind, string>> = {
  progress: "📈 Progress",
  rank: "🏆 Rank",
  streak: "🔥 Streak",
  gain: "⚡ Latest gain",
  milestone: "🎯 Milestone",
  target: "📅 Year-end target",
};

/** A 10-block text bar toward 500K. */
const bar = (pct: number) => {
  const full = Math.round(Math.min(pct, 100) / 10);
  return "█".repeat(full) + "░".repeat(10 - full);
};

function connectPrompt() {
  return {
    text: "👋 This chat isn't linked yet.\n\nOpen <b>progresshub → Profile → Connect Telegram</b> and tap the button there. It brings you back here, linked.",
    keyboard: new InlineKeyboard().url("Open progresshub", `${siteOrigin()}/profile`),
  };
}

/** "Post on X" + "Copy link" for a card (or why it can't be shared yet), plus Menu. */
function shareKeyboard(c: Creator, kind: ShareKind) {
  const kb = new InlineKeyboard();
  if (!c.handle || !c.isPublic) return { note: "\n\n<i>Make your profile public on progresshub to share this on X.</i>", kb: kb.text("☰ Menu", "m:menu") };
  const card = buildShareCard(kind, c);
  if (!card.available) return { note: "", kb: kb.text("☰ Menu", "m:menu") };
  const url = `${siteOrigin()}${card.sharePath}`;
  const intent = `https://x.com/intent/post?text=${encodeURIComponent(card.postText)}&url=${encodeURIComponent(url)}`;
  return {
    note: `\n\n🔗 Share link (shows a preview card on X):\n${esc(url)}`,
    kb: kb.url("𝕏 Post on X", intent).copyText("📋 Copy link", url).row().text("☰ Menu", "m:menu"),
  };
}

function statText(kind: "progress" | "rank" | "streak" | "milestones", c: Creator): string {
  if (!c.latest) return "You haven't logged anything yet. Send today's total, like <b>28,400</b>.";
  const total = c.latest.total;
  const pct = (total / GOAL) * 100;
  switch (kind) {
    case "progress":
      return [
        `📈 <b>${fmt(total)}</b> / 500K impressions`,
        `<code>${bar(pct)}</code> ${fmtPct(pct)}`,
        `7-day pace: <b>${fmtSigned(c.pace7)}/day</b>`,
        c.eta ? `500K around <b>${fmtDate(c.eta.etaDate)}</b>` : "Log a few more days for a 500K estimate.",
      ].join("\n");
    case "rank":
      return c.rank
        ? `🏆 You're <b>#${c.rank.rank}</b> of ${fmt(c.rank.of)} ${c.rank.of === 1 ? "creator" : "creators"}\n${fmt(total)} impressions · ${fmtPct(pct)} of 500K`
        : "🏆 You're not on the leaderboard yet. Add your X username on progresshub to join.";
    case "streak": {
      const logged = new Set(c.rows.map((r) => r.date));
      const strip = Array.from({ length: 14 }, (_, i) => (logged.has(addDays(c.today, i - 13)) ? "🟩" : "⬛")).join("");
      return `🔥 <b>${c.streak}-day</b> streak\n${strip}\n<i>last 14 days</i>`;
    }
    case "milestones": {
      const passed = reachedMilestones(c.rows);
      const next = Math.floor(total / MILESTONE_STEP) * MILESTONE_STEP + MILESTONE_STEP;
      const recent = passed.slice(-5).reverse().map((m) => `✅ ${fmtCompact(m.target)} · ${fmtDateShort(m.date)}`);
      return [
        `🎯 <b>${passed.length}/20</b> milestones`,
        ...(recent.length ? recent : ["None yet. The first is 25K."]),
        total < GOAL ? `Next: <b>${fmtCompact(next)}</b> (${fmt(next - total)} to go)` : "🏁 500K reached!",
      ].join("\n");
    }
  }
}

const shareKindFor = { progress: "progress", rank: "rank", streak: "streak", milestones: "milestone" } as const;

async function sendStat(ctx: Context, link: Link, kind: keyof typeof shareKindFor) {
  const c = await loadCreator(link);
  if (!c) return ctx.reply("Couldn't load your account. Try again in a moment.");
  const { note, kb } = c.latest ? shareKeyboard(c, shareKindFor[kind]) : { note: "", kb: MENU() };
  return ctx.reply(statText(kind, c) + note, { ...html, reply_markup: kb });
}

async function sendShareMenu(ctx: Context, link: Link) {
  const c = await loadCreator(link);
  if (!c) return ctx.reply("Couldn't load your account. Try again in a moment.");
  const kb = new InlineKeyboard();
  let n = 0;
  for (const [kind, label] of Object.entries(SHARE_LABELS) as [ShareKind, string][]) {
    if (!buildShareCard(kind, c).available) continue;
    kb.text(label, `s:${kind}`);
    if (++n % 2 === 0) kb.row();
  }
  if (!n) return ctx.reply("Nothing to share yet. Log a couple of days first.", { reply_markup: MENU() });
  return ctx.reply("🔗 Which card do you want to post on X?", { reply_markup: kb.row().text("☰ Menu", "m:menu") });
}

/** Parse → (Groq) → resolve gains to a total → validate → ask to confirm. */
async function handleLogText(ctx: Context, link: Link, text: string) {
  const c = await loadCreator(link);
  if (!c) return ctx.reply("Couldn't load your account. Try again in a moment.");
  const parsed = parseLogMessage(text, c.today) ?? (await extractWithGroq(text, c.today));
  if (!parsed) {
    return ctx.reply("I didn't catch a number. Send today's total like <b>28,400</b>, or what you added like <b>+1,200</b>.", {
      ...html,
      reply_markup: MENU(),
    });
  }

  const before = [...c.rows].reverse().find((r) => toUTC(r.date) < toUTC(parsed.date)) ?? null;
  const after = c.rows.find((r) => toUTC(r.date) > toUTC(parsed.date)) ?? null;
  const total = parsed.kind === "gain" ? (before?.total ?? 0) + parsed.value : parsed.value;
  const problem = validateEntry({ date: parsed.date, total, today: c.today, before, after });
  if (problem) return ctx.reply(`⚠️ ${esc(problem)}`, { ...html, reply_markup: MENU() });

  const gain = before ? total - before.total : null;
  const day = parsed.date === c.today ? `today (${fmtDateShort(parsed.date)})` : fmtDate(parsed.date);
  return ctx.reply(
    `Save <b>${fmt(total)}</b> for ${day}?${gain != null ? `\nThat's <b>${fmtSigned(gain)}</b> since ${fmtDateShort(before!.date)}.` : ""}`,
    { ...html, reply_markup: new InlineKeyboard().text("✅ Save", `save:${parsed.date}:${total}`).text("✖ Cancel", "x") },
  );
}

async function handleSave(ctx: Context, link: Link, date: string, total: number) {
  const before = await loadCreator(link);
  if (!before) return ctx.answerCallbackQuery({ text: "Couldn't load your account." });
  const bestBefore = Math.max(0, ...before.rows.filter((r) => r.date !== date).map((r) => r.total));

  const result = await saveEntryFor(db(), link.user_id, date, total, todayIn(link.tz));
  await ctx.answerCallbackQuery(result.ok ? { text: "Saved ✅" } : { text: "Not saved" });
  if (!result.ok) return ctx.editMessageText(`⚠️ ${esc(result.error)}`, { ...html, reply_markup: MENU() });

  const c = await loadCreator(link);
  const pct = (total / GOAL) * 100;
  const lines = [
    `✅ ${result.created ? "Logged" : "Updated"} <b>${fmtDate(date)}</b>: <b>${fmt(total)}</b>`,
    `<code>${bar(pct)}</code> ${fmtPct(pct)} of 500K`,
    c?.eta ? `500K around <b>${fmtDate(c.eta.etaDate)}</b>` : null,
  ].filter(Boolean);

  const crossed = milestoneCrossed(bestBefore, Math.max(bestBefore, total));
  if (crossed && c) {
    const { note, kb } = shareKeyboard(c, "milestone");
    return ctx.editMessageText(`${lines.join("\n")}\n\n🎉 <b>Milestone: ${fmtCompact(crossed)}!</b>${note}`, { ...html, reply_markup: kb });
  }
  return ctx.editMessageText(lines.join("\n"), { ...html, reply_markup: MENU() });
}

export function createBot(token = process.env.TELEGRAM_BOT_TOKEN) {
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  const bot = new Bot(token);

  // /start <code> links the chat; plain /start shows the menu or how to link.
  bot.command("start", async (ctx) => {
    const code = ctx.match.trim();
    if (code) {
      const linked = await redeemLinkToken(code, ctx.chat.id);
      if (!linked) return ctx.reply("That connect link expired. Open progresshub → Profile → Connect Telegram to get a fresh one.");
      return ctx.reply(
        `🎉 Linked${linked.handle ? ` to <b>@${esc(linked.handle)}</b>` : ""}!\n\nSend your total any time, like <b>28,400</b> or <b>+1,200</b>. I'll also remind you on days you haven't logged.`,
        { ...html, reply_markup: MENU() },
      );
    }
    const link = await getLinkByChat(ctx.chat.id);
    if (!link) {
      const p = connectPrompt();
      return ctx.reply(p.text, { ...html, reply_markup: p.keyboard });
    }
    return ctx.reply("What do you want to do?", { reply_markup: MENU() });
  });

  // Everything else needs a linked chat.
  bot.use(async (ctx, next) => {
    if (!ctx.chat) return;
    const link = await getLinkByChat(ctx.chat.id);
    if (!link) {
      if (ctx.callbackQuery) await ctx.answerCallbackQuery();
      const p = connectPrompt();
      return void (await ctx.reply(p.text, { ...html, reply_markup: p.keyboard }));
    }
    ctx.link = link;
    await next();
  });

  bot.command("menu", (ctx) => ctx.reply("What do you want to do?", { reply_markup: MENU() }));
  bot.command("log", (ctx) => ctx.reply("Send today's total from X analytics, like <b>28,400</b>. Or what you added, like <b>+1,200</b>.", html));
  bot.command("progress", (ctx) => sendStat(ctx, ctx.link!, "progress"));
  bot.command("rank", (ctx) => sendStat(ctx, ctx.link!, "rank"));
  bot.command("share", (ctx) => sendShareMenu(ctx, ctx.link!));
  bot.command("unlink", async (ctx) => {
    await unlinkChat(ctx.chat.id);
    return ctx.reply("Unlinked. This chat won't get reminders or show your stats anymore.");
  });

  bot.callbackQuery(/^m:(\w+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const what = ctx.match[1];
    if (what === "menu") return ctx.reply("What do you want to do?", { reply_markup: MENU() });
    if (what === "log") return ctx.reply("Send today's total, like <b>28,400</b>. Or what you added, like <b>+1,200</b>.", html);
    if (what === "share") return sendShareMenu(ctx, ctx.link!);
    if (what === "progress" || what === "rank" || what === "streak" || what === "milestones") return sendStat(ctx, ctx.link!, what);
  });

  bot.callbackQuery(/^s:(\w+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const kind = ctx.match[1] as ShareKind;
    const c = await loadCreator(ctx.link!);
    if (!c || !(kind in SHARE_LABELS)) return;
    const card = buildShareCard(kind, c);
    const { note, kb } = shareKeyboard(c, kind);
    return ctx.reply(`${SHARE_LABELS[kind]} card ready.\n\n<i>${esc(card.postText)}</i>${note}`, { ...html, reply_markup: kb });
  });

  bot.callbackQuery(/^save:(\d{4}-\d{2}-\d{2}):(\d+)$/, (ctx) => handleSave(ctx, ctx.link!, ctx.match[1], Number(ctx.match[2])));

  bot.callbackQuery("x", async (ctx) => {
    await ctx.answerCallbackQuery({ text: "Cancelled" });
    return ctx.editMessageText("Cancelled. Send the number again whenever you're ready.", { reply_markup: MENU() });
  });

  bot.on("message:text", (ctx) => handleLogText(ctx, ctx.link!, ctx.message.text));

  bot.catch((err) => console.error("telegram bot error", err.error));
  return bot;
}

declare module "grammy" {
  interface Context {
    /** Set by the link middleware for every update after /start. */
    link?: Link;
  }
}
