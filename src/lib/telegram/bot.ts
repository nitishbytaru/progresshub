import "server-only";
import { Bot, InlineKeyboard, type Context } from "grammy";
import { saveEntryFor } from "../entries";
import { buildShareCard, type ShareKind } from "../share-cards";
import { db, getLinkByChat, loadCreator, redeemLinkToken, siteOrigin, todayIn, unlinkChat, type Creator, type Link } from "./data";
import { interpretMessage } from "./groq";
import {
  bestExcluding,
  CANCELLED,
  confirmReply,
  esc,
  etaReply,
  HELP,
  linkedText,
  LOAD_FAILED,
  LOG_PROMPT,
  MENU_PROMPT,
  NOTHING_TO_SHARE,
  OFF_TOPIC,
  PRIVATE_NOTE,
  savedReply,
  SHARE_LABELS,
  shareKindFor,
  shareLinks,
  SHARE_PROMPT,
  statText,
  targetReply,
  type StatKind,
} from "./messages";
import { parseLogMessage, type ParsedLog } from "./parse";

/**
 * The progresshub Telegram bot: link an account, log a day in plain words (code parser first,
 * Groq as fallback, always confirmed with a button), and a button menu of stats, each with
 * "Post on X" and "Copy link" so every answer can be shared.
 */

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

function connectPrompt() {
  return {
    text: "👋 This chat isn't linked yet.\n\nOpen <b>progresshub → Profile → Connect Telegram</b> and tap the button there. It brings you back here, linked.",
    keyboard: new InlineKeyboard().url("Open progresshub", `${siteOrigin()}/profile`),
  };
}

/** "Post on X" + "Copy link" for a card (or why it can't be shared yet), plus Menu. */
function shareKeyboard(c: Creator, kind: ShareKind, opts?: Parameters<typeof shareLinks>[2]) {
  const kb = new InlineKeyboard();
  if (!c.handle || !c.isPublic) return { note: PRIVATE_NOTE, kb: kb.text("☰ Menu", "m:menu") };
  const links = shareLinks(c, kind, opts);
  if (!links) return { note: "", kb: kb.text("☰ Menu", "m:menu") };
  return {
    note: "", // the link travels inside the Post on X button, not the message text
    kb: kb.url("𝕏 Post on X", links.intent).copyText("📋 Copy link", links.url).row().text("☰ Menu", "m:menu"),
  };
}

async function sendStat(ctx: Context, link: Link, kind: StatKind) {
  const c = await loadCreator(link);
  if (!c) return ctx.reply(LOAD_FAILED);
  const { note, kb } = c.latest ? shareKeyboard(c, shareKindFor[kind]) : { note: "", kb: MENU() };
  return ctx.reply(statText(kind, c) + note, { ...html, reply_markup: kb });
}

async function sendShareMenu(ctx: Context, link: Link) {
  const c = await loadCreator(link);
  if (!c) return ctx.reply(LOAD_FAILED);
  const kb = new InlineKeyboard();
  let n = 0;
  for (const [kind, label] of Object.entries(SHARE_LABELS) as [ShareKind, string][]) {
    if (!buildShareCard(kind, c).available) continue;
    kb.text(label, `s:${kind}`);
    if (++n % 2 === 0) kb.row();
  }
  if (!n) return ctx.reply(NOTHING_TO_SHARE, { reply_markup: MENU() });
  return ctx.reply(SHARE_PROMPT, { reply_markup: kb.row().text("☰ Menu", "m:menu") });
}

/**
 * A typed message. A clean log ("28,400", "+1.2k") is read by code with no LLM call. Anything
 * else goes to Groq, which only classifies it; the answer itself always comes from the database.
 * (Menu buttons never reach this: they're handled directly, with no LLM.)
 */
async function handleText(ctx: Context, link: Link, text: string) {
  const c = await loadCreator(link);
  if (!c) return ctx.reply(LOAD_FAILED);

  const direct = parseLogMessage(text, c.today);
  if (direct) return confirmLog(ctx, c, direct);

  await ctx.replyWithChatAction("typing");
  const intent = await interpretMessage(text, c.today);
  switch (intent?.kind) {
    case "log":
      return confirmLog(ctx, c, intent.log);
    case "eta":
      return replyEta(ctx, c);
    case "target":
      return replyTarget(ctx, c, intent.date);
    case "progress":
    case "rank":
    case "streak":
    case "milestones":
      return sendStat(ctx, link, intent.kind);
    case "share":
      return sendShareMenu(ctx, link);
    case "help":
      return ctx.reply(HELP, { reply_markup: MENU() });
    default:
      return ctx.reply(OFF_TOPIC, { ...html, reply_markup: MENU() });
  }
}

function replyEta(ctx: Context, c: Creator) {
  const { text, share } = etaReply(c);
  if (!share) return ctx.reply(text, { ...html, reply_markup: MENU() });
  const { note, kb } = shareKeyboard(c, "progress");
  return ctx.reply(text + note, { ...html, reply_markup: kb });
}

function replyTarget(ctx: Context, c: Creator, target: string) {
  const { text, share } = targetReply(c, target);
  if (!share) return ctx.reply(text, { ...html, reply_markup: MENU() });
  // No privacy note here: a private creator just gets the plan.
  return ctx.reply(text, { ...html, reply_markup: shareKeyboard(c, "target", { target }).kb });
}

/** Resolve a gain to a total, validate, then ask to confirm before saving. */
async function confirmLog(ctx: Context, c: Creator, parsed: ParsedLog) {
  const reply = confirmReply(c, parsed);
  if (!reply.ok) return ctx.reply(reply.text, { ...html, reply_markup: MENU() });
  return ctx.reply(reply.text, {
    ...html,
    reply_markup: new InlineKeyboard().text("✅ Save", `save:${reply.date}:${reply.total}`).text("✖ Cancel", "x"),
  });
}

async function handleSave(ctx: Context, link: Link, date: string, total: number) {
  const before = await loadCreator(link);
  if (!before) return ctx.answerCallbackQuery({ text: "Couldn't load your account." });
  const bestBefore = bestExcluding(before, date);

  const result = await saveEntryFor(db(), link.user_id, date, total, todayIn(link.tz));
  await ctx.answerCallbackQuery(result.ok ? { text: "Saved ✅" } : { text: "Not saved" });
  if (!result.ok) return ctx.editMessageText(`⚠️ ${esc(result.error)}`, { ...html, reply_markup: MENU() });

  const c = await loadCreator(link);
  const { text, crossed } = savedReply(c, date, total, result.created, bestBefore);
  if (crossed && c) {
    const { note, kb } = shareKeyboard(c, "milestone");
    return ctx.editMessageText(text + note, { ...html, reply_markup: kb });
  }
  return ctx.editMessageText(text, { ...html, reply_markup: MENU() });
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
      return ctx.reply(linkedText(linked.handle), { ...html, reply_markup: MENU() });
    }
    const link = await getLinkByChat(ctx.chat.id);
    if (!link) {
      const p = connectPrompt();
      return ctx.reply(p.text, { ...html, reply_markup: p.keyboard });
    }
    return ctx.reply(MENU_PROMPT, { reply_markup: MENU() });
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

  bot.command("menu", (ctx) => ctx.reply(MENU_PROMPT, { reply_markup: MENU() }));
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
    if (what === "menu") return ctx.reply(MENU_PROMPT, { reply_markup: MENU() });
    if (what === "log") return ctx.reply(LOG_PROMPT, html);
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
    return ctx.editMessageText(CANCELLED, { reply_markup: MENU() });
  });

  bot.on("message:text", (ctx) => handleText(ctx, ctx.link!, ctx.message.text));

  bot.catch((err) => console.error("telegram bot error", err.error));
  return bot;
}

declare module "grammy" {
  interface Context {
    /** Set by the link middleware for every update after /start. */
    link?: Link;
  }
}
