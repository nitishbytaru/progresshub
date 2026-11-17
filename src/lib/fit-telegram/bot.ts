import "server-only";
import { Bot, InlineKeyboard, type Context } from "grammy";
import { parseMeal } from "../fit-ai";
import { MUSCLES, isMuscle, muscleLabel, parseWeight, type Muscle } from "../fit-units";
import type { CoreMeal } from "../fit-foods";
import {
  checkDay,
  dropPending,
  fitOrigin,
  getFitLink,
  getPending,
  loadSummary,
  putPending,
  redeemFitToken,
  saveFood,
  saveGym,
  saveWeight,
  takeMealAI,
  todayIn,
  unlinkFitChat,
  updatePending,
  MEAL_AI_CAP,
  type FitLink,
  type Pending,
} from "./data";
import { interpretFit } from "./groq";
import {
  FOOD_PROMPT,
  HELP,
  LINKED,
  MEAL_LABEL,
  MENU_PROMPT,
  NO_WEIGHT,
  OFF_TOPIC,
  WEIGHT_PROMPT,
  esc,
  foodConfirm,
  foodSaved,
  gymPickPrompt,
  gymSaved,
  summaryText,
  weightConfirm,
  weightSaved,
} from "./messages";
import { mealForHour, parseFitMessage } from "./parse";

/**
 * The progresshub fit Telegram bot (separate from the X bot): link from fit → Me, then log
 * weigh-ins, gym days and food in plain words. The code parser runs first, Groq only classifies
 * what it can't read, and every write waits for a ✅ tap.
 */

const html = { parse_mode: "HTML" as const, link_preview_options: { is_disabled: true } };

const MENU = () =>
  new InlineKeyboard()
    .text("⚖️ Weigh-in", "m:weight")
    .text("🏋️ Gym", "m:gym")
    .row()
    .text("🍛 Food", "m:food")
    .text("📊 Today", "m:today");

const openFit = (path = "") => new InlineKeyboard().url("🌐 Open fit", `${fitOrigin()}${path}`);

function connectPrompt() {
  return {
    text: "👋 This chat isn't linked yet.\n\nOpen <b>progresshub fit → Me → Telegram</b> and tap Connect. It brings you back here, linked.",
    keyboard: new InlineKeyboard().url("Open progresshub fit", `${fitOrigin()}/me`),
  };
}

const confirmKb = (id: string, label = "✅ Save") => new InlineKeyboard().text(label, `ok:${id}`).text("✖ Cancel", `x:${id}`);

function gymKb(id: string, muscles: Muscle[], forgot: boolean) {
  const kb = new InlineKeyboard();
  MUSCLES.forEach((m, i) => {
    kb.text(`${muscles.includes(m) ? "✅ " : ""}${muscleLabel(m)}`, `t:${id}:${m}`);
    if (i % 2 === 1) kb.row();
  });
  kb.text(`${forgot ? "✅ " : ""}🤷 Don't remember`, `f:${id}`).row();
  kb.text("💾 Save gym day", `ok:${id}`).text("✖ Cancel", `x:${id}`);
  return kb;
}

function foodKb(id: string, meal: CoreMeal) {
  const kb = new InlineKeyboard();
  (["breakfast", "lunch", "snack", "dinner"] as CoreMeal[]).forEach((m) => kb.text(`${m === meal ? "● " : ""}${MEAL_LABEL[m]}`, `ml:${id}:${m[0]}`));
  return kb.row().text("✅ Add", `ok:${id}`).text("✖ Cancel", `x:${id}`);
}

const MEAL_BY_LETTER: Record<string, CoreMeal> = { b: "breakfast", l: "lunch", s: "snack", d: "dinner" };

// ---- Steps that ask before saving.
async function askWeight(ctx: Context, link: FitLink, day: string, kg: number) {
  const today = todayIn(link.tz);
  const bad = checkDay(day, today);
  if (bad) return ctx.reply(bad, { reply_markup: MENU() });
  const id = await putPending(link.user_id, { kind: "weight", day, kg });
  if (!id) return ctx.reply("Couldn't start that. Try again in a moment.");
  return ctx.reply(weightConfirm(kg, day, today), { ...html, reply_markup: confirmKb(id) });
}

async function askGym(ctx: Context, link: FitLink, day: string, muscles: Muscle[], forgot: boolean) {
  const today = todayIn(link.tz);
  const bad = checkDay(day, today);
  if (bad) return ctx.reply(bad, { reply_markup: MENU() });
  const id = await putPending(link.user_id, { kind: "gym", day, gym: true, muscles: forgot ? [] : muscles });
  if (!id) return ctx.reply("Couldn't start that. Try again in a moment.");
  return ctx.reply(gymPickPrompt(day, today, muscles, forgot), { ...html, reply_markup: gymKb(id, forgot ? [] : muscles, forgot) });
}

async function saveRest(ctx: Context, link: FitLink, day: string, edit = false) {
  const today = todayIn(link.tz);
  const bad = checkDay(day, today);
  if (bad) return ctx.reply(bad, { reply_markup: MENU() });
  const r = await saveGym(link.user_id, day, false, []);
  const text = r.ok ? gymSaved(day, today, false, []) : r.error === "NO_WEIGHT" ? NO_WEIGHT(day, today) : `⚠️ ${esc(r.error)}`;
  return edit ? ctx.editMessageText(text, { ...html, reply_markup: MENU() }) : ctx.reply(text, { ...html, reply_markup: MENU() });
}

async function askFood(ctx: Context, link: FitLink, day: string, meal: CoreMeal | null, text: string) {
  const today = todayIn(link.tz);
  const bad = checkDay(day, today);
  if (bad) return ctx.reply(bad, { reply_markup: MENU() });
  if (!(await takeMealAI(link.user_id, today))) {
    return ctx.reply(`You've used today's ${MEAL_AI_CAP} AI food entries. Add the rest on the website.`, { reply_markup: openFit("/food") });
  }
  await ctx.replyWithChatAction("typing");
  const items = await parseMeal(text);
  if (items === null) return ctx.reply("AI is unavailable right now. Add it on the website instead.", { reply_markup: openFit("/food") });
  if (!items.length) return ctx.reply("Couldn't find any food in that. Try e.g. <b>lunch 2 roti, dal and curd</b>.", html);
  const m = meal ?? mealForHour(link.tz);
  const id = await putPending(link.user_id, { kind: "food", day, meal: m, items });
  if (!id) return ctx.reply("Couldn't start that. Try again in a moment.");
  return ctx.reply(foodConfirm(items, m, day, today), { ...html, reply_markup: foodKb(id, m) });
}

async function sendSummary(ctx: Context, link: FitLink) {
  const s = await loadSummary(link);
  return ctx.reply(summaryText(s), { ...html, reply_markup: MENU() });
}

async function handleText(ctx: Context, link: FitLink, text: string) {
  const today = todayIn(link.tz);
  const direct = parseFitMessage(text, today);
  if (direct) {
    switch (direct.kind) {
      case "weight":
        return askWeight(ctx, link, direct.day, direct.kg);
      case "weight_error":
        return ctx.reply(direct.error);
      case "gym":
        return askGym(ctx, link, direct.day, direct.muscles, direct.forgot);
      case "rest":
        return saveRest(ctx, link, direct.day);
      case "food":
        return askFood(ctx, link, direct.day, direct.meal, direct.text);
      case "summary":
        return sendSummary(ctx, link);
    }
  }
  if (/^(hi|hello|hey|help|start|menu)\b/i.test(text.trim())) return ctx.reply(HELP, { ...html, reply_markup: MENU() });

  await ctx.replyWithChatAction("typing");
  const intent = await interpretFit(text, today);
  switch (intent?.kind) {
    case "weight": {
      const p = parseWeight(String(intent.value), intent.unit);
      return "error" in p ? ctx.reply(p.error) : askWeight(ctx, link, intent.day, p.kg);
    }
    case "gym":
      return askGym(ctx, link, intent.day, intent.muscles, intent.forgot);
    case "rest":
      return saveRest(ctx, link, intent.day);
    case "food":
      return askFood(ctx, link, intent.day, intent.meal, intent.text);
    case "summary":
      return sendSummary(ctx, link);
    case "help":
      return ctx.reply(HELP, { ...html, reply_markup: MENU() });
    default:
      return ctx.reply(OFF_TOPIC, { ...html, reply_markup: MENU() });
  }
}

/** ✅ on any pending step: write it, then edit the message into the result. */
async function confirm(ctx: Context, link: FitLink, id: string) {
  const p = await getPending(link.user_id, id);
  if (!p) {
    await ctx.answerCallbackQuery({ text: "That expired. Send it again." });
    return ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => undefined);
  }
  await ctx.answerCallbackQuery({ text: "Saving…" });
  const today = todayIn(link.tz);
  if (p.kind === "weight") {
    const r = await saveWeight(link.user_id, p.day, p.kg);
    await dropPending(link.user_id, id);
    if (!r.ok) return ctx.editMessageText(`⚠️ ${esc(r.error)}`, { ...html, reply_markup: MENU() });
    // Follow-up: gym or rest for the same day.
    return ctx.editMessageText(weightSaved(p.kg, p.day, today), {
      ...html,
      reply_markup: new InlineKeyboard().text("🏋️ Gym", `g:${p.day}`).text("😴 Rest", `r:${p.day}`).text("Skip", "m:done"),
    });
  }
  if (p.kind === "gym") {
    const r = await saveGym(link.user_id, p.day, true, p.muscles);
    if (!r.ok && r.error === "NO_WEIGHT") return ctx.editMessageText(NO_WEIGHT(p.day, today), { ...html, reply_markup: MENU() });
    await dropPending(link.user_id, id);
    return ctx.editMessageText(r.ok ? gymSaved(p.day, today, true, p.muscles) : `⚠️ ${esc(r.error)}`, { ...html, reply_markup: openFit("/log") });
  }
  const r = await saveFood(link.user_id, p.day, p.meal, p.items);
  await dropPending(link.user_id, id);
  const kcal = p.items.reduce((s, i) => s + i.kcal, 0);
  return ctx.editMessageText(r.ok ? foodSaved(p.items.length, p.meal, kcal) : `⚠️ ${esc(r.error)}`, {
    ...html,
    reply_markup: new InlineKeyboard().text("📊 Today", "m:today").url("🌐 Open fit", `${fitOrigin()}/food`),
  });
}

export function createFitBot(token = process.env.TELEGRAM_FIT_BOT_TOKEN) {
  if (!token) throw new Error("TELEGRAM_FIT_BOT_TOKEN is not set");
  const bot = new Bot(token);

  // /start <code> links the chat; plain /start shows the menu or how to link.
  bot.command("start", async (ctx) => {
    const code = ctx.match.trim();
    if (code) {
      const ok = await redeemFitToken(code, ctx.chat.id);
      if (!ok) return ctx.reply("That connect link expired. Open progresshub fit → Me → Telegram to get a fresh one.");
      return ctx.reply(LINKED, { ...html, reply_markup: MENU() });
    }
    const link = await getFitLink(ctx.chat.id);
    if (!link) {
      const p = connectPrompt();
      return ctx.reply(p.text, { ...html, reply_markup: p.keyboard });
    }
    return ctx.reply(MENU_PROMPT, { reply_markup: MENU() });
  });

  // Everything else needs a linked chat.
  bot.use(async (ctx, next) => {
    if (!ctx.chat) return;
    const link = await getFitLink(ctx.chat.id);
    if (!link) {
      if (ctx.callbackQuery) await ctx.answerCallbackQuery();
      const p = connectPrompt();
      return void (await ctx.reply(p.text, { ...html, reply_markup: p.keyboard }));
    }
    ctx.fitLink = link;
    await next();
  });

  bot.command("menu", (ctx) => ctx.reply(MENU_PROMPT, { reply_markup: MENU() }));
  bot.command("help", (ctx) => ctx.reply(HELP, { ...html, reply_markup: MENU() }));
  bot.command("summary", (ctx) => sendSummary(ctx, ctx.fitLink!));
  bot.command("weight", (ctx) => (ctx.match.trim() ? handleText(ctx, ctx.fitLink!, `w ${ctx.match}`) : ctx.reply(WEIGHT_PROMPT, html)));
  bot.command("gym", (ctx) => handleText(ctx, ctx.fitLink!, `gym ${ctx.match}`));
  bot.command("food", (ctx) => (ctx.match.trim() ? handleText(ctx, ctx.fitLink!, `ate ${ctx.match}`) : ctx.reply(FOOD_PROMPT, html)));
  bot.command("unlink", async (ctx) => {
    await unlinkFitChat(ctx.chat.id);
    return ctx.reply("Unlinked. This chat can't log to progresshub fit anymore.");
  });

  bot.callbackQuery(/^m:(\w+)$/, async (ctx) => {
    const what = ctx.match[1];
    const link = ctx.fitLink!;
    if (what === "done") {
      await ctx.answerCallbackQuery();
      return ctx.editMessageReplyMarkup({ reply_markup: openFit() });
    }
    await ctx.answerCallbackQuery();
    if (what === "weight") return ctx.reply(WEIGHT_PROMPT, html);
    if (what === "food") return ctx.reply(FOOD_PROMPT, html);
    if (what === "today") return sendSummary(ctx, link);
    if (what === "gym") return askGym(ctx, link, todayIn(link.tz), [], false);
  });

  // After a weigh-in: gym or rest for that day.
  bot.callbackQuery(/^g:(\d{4}-\d{2}-\d{2})$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => undefined);
    return askGym(ctx, ctx.fitLink!, ctx.match[1], [], false);
  });
  bot.callbackQuery(/^r:(\d{4}-\d{2}-\d{2})$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    return saveRest(ctx, ctx.fitLink!, ctx.match[1], true);
  });

  // Gym picker: toggle a muscle, or "don't remember".
  bot.callbackQuery(/^(t|f):([0-9a-f-]{36})(?::(\w+))?$/, async (ctx) => {
    const link = ctx.fitLink!;
    const [, op, id, m] = ctx.match;
    const p = await getPending(link.user_id, id);
    if (!p || p.kind !== "gym") return ctx.answerCallbackQuery({ text: "That expired. Send it again." });
    await ctx.answerCallbackQuery();
    let next: Pending & { kind: "gym" };
    let forgot = false;
    if (op === "f") {
      // "Don't remember" clears any ticked muscles: the day saves as a bare (steel) gym day.
      next = { ...p, muscles: [] };
      forgot = true;
    } else {
      if (!isMuscle(m)) return;
      next = { ...p, muscles: p.muscles.includes(m) ? p.muscles.filter((x) => x !== m) : [...p.muscles, m] };
    }
    await updatePending(link.user_id, id, next);
    const today = todayIn(link.tz);
    return ctx.editMessageText(gymPickPrompt(next.day, today, next.muscles, forgot), { ...html, reply_markup: gymKb(id, next.muscles, forgot) });
  });

  // Food: switch the meal before adding.
  bot.callbackQuery(/^ml:([0-9a-f-]{36}):([blsd])$/, async (ctx) => {
    const link = ctx.fitLink!;
    const [, id, letter] = ctx.match;
    const p = await getPending(link.user_id, id);
    if (!p || p.kind !== "food") return ctx.answerCallbackQuery({ text: "That expired. Send it again." });
    await ctx.answerCallbackQuery();
    const next = { ...p, meal: MEAL_BY_LETTER[letter] };
    await updatePending(link.user_id, id, next);
    return ctx.editMessageText(foodConfirm(next.items, next.meal, next.day, todayIn(link.tz)), { ...html, reply_markup: foodKb(id, next.meal) });
  });

  bot.callbackQuery(/^ok:([0-9a-f-]{36})$/, (ctx) => confirm(ctx, ctx.fitLink!, ctx.match[1]));
  bot.callbackQuery(/^x:([0-9a-f-]{36})$/, async (ctx) => {
    await dropPending(ctx.fitLink!.user_id, ctx.match[1]);
    await ctx.answerCallbackQuery({ text: "Cancelled" });
    return ctx.editMessageText("✖ Cancelled. Nothing was saved.", { reply_markup: MENU() });
  });

  bot.on("message:text", (ctx) => handleText(ctx, ctx.fitLink!, ctx.message.text));

  bot.catch((err) => console.error("fit telegram bot error", err.error));
  return bot;
}

declare module "grammy" {
  interface Context {
    /** Set by the fit bot's link middleware for every update after /start. */
    fitLink?: FitLink;
  }
}
