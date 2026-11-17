import "server-only";
import { Bot, GrammyError, InlineKeyboard, type Context } from "grammy";
import { parseMeal } from "../fit-ai";
import { MUSCLES, isMuscle, muscleLabel, parseWeight, type Muscle, type Unit } from "../fit-units";
import type { CoreMeal } from "../fit-foods";
import { addDays } from "../progress";
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
  dayLabel,
  esc,
  foodSaved,
  gymSaved,
  summaryText,
  weightSaved,
} from "./messages";
import { hasAmount, parseFitMessage, splitDays } from "./parse";

/**
 * The progresshub fit Telegram bot (separate from the X bot): link from fit → Me, then log
 * weigh-ins, gym days and food in plain words. The code parser runs first, Groq only classifies
 * what it can't read. Nothing is guessed: a missing unit, day, meal, muscles or amount is asked for
 * with buttons, and every write waits for a ✅ tap.
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

/** Edit the tapped message; an identical redraw ("message is not modified") is not an error. */
async function edit(ctx: Context, text: string, kb?: InlineKeyboard) {
  try {
    await ctx.editMessageText(text, { ...html, reply_markup: kb });
  } catch (e) {
    if (e instanceof GrammyError && /not modified/i.test(e.description)) return;
    throw e;
  }
}

const MEAL_BY_LETTER: Record<string, CoreMeal> = { b: "breakfast", l: "lunch", s: "snack", d: "dinner" };
const n = (v: number) => Math.round(v).toLocaleString("en-US");

/** Day picker row: today, yesterday, 2 days ago (older days: type the date words, or use the site). */
function dayRow(kb: InlineKeyboard, id: string, p: Pending, today: string) {
  [0, 1, 2].forEach((k) => {
    const d = addDays(today, -k);
    const on = p.dayGiven && p.day === d;
    kb.text(`${on ? "● " : ""}${k === 0 ? "Today" : k === 1 ? "Yesterday" : dayLabel(d, today)}`, `d:${id}:${k}`);
  });
  return kb.row();
}

/**
 * One card per pending step: what we know, and a button row for each thing still missing.
 * The save button only appears once nothing is missing.
 */
function render(p: Pending, id: string, today: string): { text: string; kb: InlineKeyboard } {
  const kb = new InlineKeyboard();
  const ask: string[] = [];
  const when = p.dayGiven ? dayLabel(p.day, today) : null;

  if (p.kind === "weight") {
    const head = `⚖️ Weigh-in <b>${p.value}${p.unit ? ` ${p.unit}` : ""}</b>${when ? `, ${when}` : ""}`;
    if (!p.unit) {
      ask.push("• Is that <b>kg</b> or <b>lb</b>?");
      kb.text(`${p.value} kg`, `u:${id}:kg`).text(`${p.value} lb`, `u:${id}:lb`).row();
    }
    if (!p.dayGiven) {
      ask.push("• Which day?");
      dayRow(kb, id, p, today);
    }
    if (!ask.length) kb.text("✅ Save", `ok:${id}`);
    kb.text("✖ Cancel", `x:${id}`);
    return { text: ask.length ? `${head}\n\n${ask.join("\n")}` : `${head}\n\nSave it?`, kb };
  }

  if (p.kind === "gym" && !p.gym) {
    const head = `😴 Rest day${when ? `, ${when}` : ""}`;
    if (!p.dayGiven) {
      ask.push("• Which day?");
      dayRow(kb, id, p, today);
    }
    if (!ask.length) kb.text("✅ Save", `ok:${id}`);
    kb.text("✖ Cancel", `x:${id}`);
    return { text: ask.length ? `${head}\n\n${ask.join("\n")}` : `${head}\n\nSave it?`, kb };
  }

  if (p.kind === "gym") {
    const picked = p.forgot ? "<i>Don't remember: saves the gym day without muscles.</i>" : p.muscles.length ? `<b>${p.muscles.map(muscleLabel).join(", ")}</b>` : null;
    const head = `🏋️ Gym day${when ? `, ${when}` : ""}${picked ? `\n${picked}` : ""}`;
    if (!picked) ask.push("• What did you train? Tap the muscles, or Don't remember.");
    MUSCLES.forEach((m, i) => {
      kb.text(`${p.muscles.includes(m) ? "✅ " : ""}${muscleLabel(m)}`, `t:${id}:${m}`);
      if (i % 2 === 1) kb.row();
    });
    kb.text(`${p.forgot ? "✅ " : ""}🤷 Don't remember`, `f:${id}`).row();
    if (!p.dayGiven) {
      ask.push("• Which day?");
      dayRow(kb, id, p, today);
    }
    if (!ask.length) kb.text("💾 Save gym day", `ok:${id}`);
    kb.text("✖ Cancel", `x:${id}`);
    return { text: ask.length ? `${head}\n\n${ask.join("\n")}` : head, kb };
  }

  if (p.kind === "foodtext") {
    return {
      text: `🍛 <b>${esc(p.text)}</b>\n\n• How much of each? Send it again with amounts, like <b>2 roti, 1 bowl dal</b>.\nOr tap below to use the usual portions (the AI's estimate).`,
      kb: kb.text("🍽 Use usual portions", `p:${id}`).text("✖ Cancel", `x:${id}`),
    };
  }

  // Food items from the AI.
  const lines = p.items.map((i) => `• ${esc(i.name)}${i.servings !== 1 ? ` × ${+i.servings.toFixed(2)}` : ""}: ${n(i.kcal)} kcal · ${n(i.protein)} g protein`);
  const kcal = p.items.reduce((s, i) => s + i.kcal, 0);
  const protein = p.items.reduce((s, i) => s + i.protein, 0);
  const head = `🍛 ${p.meal ? `<b>${MEAL_LABEL[p.meal]}</b>` : "Food"}${when ? `, ${when}` : ""}\n${lines.join("\n")}\n\n<b>${n(kcal)} kcal · ${n(protein)} g protein</b>\n<i>AI estimate: check it before adding.</i>`;
  if (!p.meal) ask.push("• Which meal?");
  (["breakfast", "lunch", "snack", "dinner"] as CoreMeal[]).forEach((m) => kb.text(`${m === p.meal ? "● " : ""}${MEAL_LABEL[m]}`, `ml:${id}:${m[0]}`));
  kb.row();
  if (!p.dayGiven) {
    ask.push("• Which day?");
    dayRow(kb, id, p, today);
  }
  if (!ask.length) kb.text("✅ Add", `ok:${id}`);
  kb.text("✖ Cancel", `x:${id}`);
  return { text: ask.length ? `${head}\n\n${ask.join("\n")}` : head, kb };
}

/** Store a new pending step and send its card. */
async function start(ctx: Context, link: FitLink, p: Pending) {
  const today = todayIn(link.tz);
  if (p.dayGiven) {
    const bad = checkDay(p.day, today);
    if (bad) return ctx.reply(bad, { reply_markup: MENU() });
  }
  const id = await putPending(link.user_id, p);
  if (!id) return ctx.reply("Couldn't start that. Try again in a moment.");
  const { text, kb } = render(p, id, today);
  return ctx.reply(text, { ...html, reply_markup: kb });
}

/** Run the AI on a food text (counts against the daily cap) and turn it into a food card. */
async function estimate(link: FitLink, p: Pending & { kind: "foodtext" }): Promise<{ items?: (Pending & { kind: "food" }); error?: string }> {
  const today = todayIn(link.tz);
  if (!(await takeMealAI(link.user_id, today))) return { error: `You've used today's ${MEAL_AI_CAP} AI food entries. Add the rest on the website.` };
  const items = await parseMeal(p.text);
  if (items === null) return { error: "AI is unavailable right now. Add it on the website instead." };
  if (!items.length) return { error: "Couldn't find any food in that. Try e.g. <b>lunch 2 roti, dal and curd</b>." };
  return { items: { kind: "food", day: p.day, dayGiven: p.dayGiven, meal: p.meal, items } };
}

async function startFood(ctx: Context, link: FitLink, day: string, dayGiven: boolean, meal: CoreMeal | null, text: string) {
  const base: Pending & { kind: "foodtext" } = { kind: "foodtext", day, dayGiven, meal, text };
  // No amounts given: ask, instead of letting the AI pick portions silently.
  if (!hasAmount(text)) return start(ctx, link, base);
  await ctx.replyWithChatAction("typing");
  const r = await estimate(link, base);
  if (r.error) return ctx.reply(r.error, { ...html, reply_markup: openFit("/food") });
  return start(ctx, link, r.items!);
}

async function sendSummary(ctx: Context, link: FitLink) {
  const s = await loadSummary(link);
  return ctx.reply(summaryText(s), { ...html, reply_markup: MENU() });
}

/** Asked when the message is about logging but too vague to act on. */
const askWhat = (ctx: Context) =>
  ctx.reply("I'm not sure what to log from that. Which one is it?\n\n• Weigh-in: send the number, like <b>72.4 kg</b>\n• Gym: like <b>gym chest triceps</b>\n• Food: like <b>lunch 2 roti, 1 bowl dal</b>", {
    ...html,
    reply_markup: MENU(),
  });

async function handleText(ctx: Context, link: FitLink, text: string) {
  const today = todayIn(link.tz);

  // Several days in one message: one card per day, or ask when it doesn't split cleanly.
  const split = splitDays(text, today);
  if (split?.ok) {
    await ctx.reply(`📅 That's ${split.parts.length} days. Check each one:`);
    for (const part of split.parts) {
      if (part.kind === "weight") await start(ctx, link, { kind: "weight", day: part.day, dayGiven: true, value: part.value, unit: part.unit });
      else if (part.kind === "gym") await start(ctx, link, { kind: "gym", day: part.day, dayGiven: true, gym: true, muscles: part.forgot ? [] : part.muscles, forgot: part.forgot });
      else if (part.kind === "rest") await start(ctx, link, { kind: "gym", day: part.day, dayGiven: true, gym: false, muscles: [], forgot: false });
    }
    return;
  }
  if (split && !split.ok) {
    return ctx.reply(
      `📅 I see <b>${split.days} days</b> in that message and I don't want to mix them up. Send one day per message, like:\n• <b>72.4 kg yesterday</b>\n• <b>gym chest triceps today</b>\n• <b>lunch yesterday 2 roti, 1 bowl dal</b>`,
      html,
    );
  }

  const direct = parseFitMessage(text, today);
  if (direct) {
    switch (direct.kind) {
      case "weight":
        return start(ctx, link, { kind: "weight", day: direct.day, dayGiven: direct.dayGiven, value: direct.value, unit: direct.unit });
      case "weight_error":
        return ctx.reply(direct.error);
      case "gym":
        return start(ctx, link, { kind: "gym", day: direct.day, dayGiven: direct.dayGiven, gym: true, muscles: direct.forgot ? [] : direct.muscles, forgot: direct.forgot });
      case "rest":
        return start(ctx, link, { kind: "gym", day: direct.day, dayGiven: direct.dayGiven, gym: false, muscles: [], forgot: false });
      case "food":
        return startFood(ctx, link, direct.day, direct.dayGiven, direct.meal, direct.text);
      case "summary":
        return sendSummary(ctx, link);
    }
  }
  if (/^(hi|hello|hey|help|start|menu)\b/i.test(text.trim())) return ctx.reply(HELP, { ...html, reply_markup: MENU() });

  await ctx.replyWithChatAction("typing");
  const intent = await interpretFit(text, today);
  switch (intent?.kind) {
    case "weight": {
      // Check the number fits the unit (or at least one unit when none was given).
      const units: Unit[] = intent.unit ? [intent.unit] : ["kg", "lb"];
      const ok = units.some((u) => !("error" in parseWeight(String(intent.value), u)));
      if (!ok) return ctx.reply((parseWeight(String(intent.value), units[0]) as { error: string }).error);
      return start(ctx, link, { kind: "weight", day: intent.day, dayGiven: intent.dayGiven, value: intent.value, unit: intent.unit });
    }
    case "gym":
      return start(ctx, link, { kind: "gym", day: intent.day, dayGiven: intent.dayGiven, gym: true, muscles: intent.forgot ? [] : intent.muscles, forgot: intent.forgot });
    case "rest":
      return start(ctx, link, { kind: "gym", day: intent.day, dayGiven: intent.dayGiven, gym: false, muscles: [], forgot: false });
    case "food":
      return startFood(ctx, link, intent.day, intent.dayGiven, intent.meal, intent.text);
    case "summary":
      return sendSummary(ctx, link);
    case "help":
      return ctx.reply(HELP, { ...html, reply_markup: MENU() });
    case "unclear":
      return askWhat(ctx);
    default:
      return ctx.reply(OFF_TOPIC, { ...html, reply_markup: MENU() });
  }
}

/** Load a pending step for a button tap, or tell the user it expired. */
async function pendingFor(ctx: Context, link: FitLink, id: string) {
  const p = await getPending(link.user_id, id);
  if (!p) {
    await ctx.answerCallbackQuery({ text: "That expired. Send it again." });
    await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => undefined);
  }
  return p;
}

/** Apply a change to a pending step and redraw its card. */
async function change(ctx: Context, link: FitLink, id: string, next: Pending) {
  const today = todayIn(link.tz);
  if (next.dayGiven) {
    const bad = checkDay(next.day, today);
    if (bad) return ctx.answerCallbackQuery({ text: bad });
  }
  await updatePending(link.user_id, id, next);
  await ctx.answerCallbackQuery();
  const { text, kb } = render(next, id, today);
  return edit(ctx, text, kb);
}

/** ✅ on a complete step: write it, then turn the card into the result. */
async function confirm(ctx: Context, link: FitLink, id: string) {
  const p = await pendingFor(ctx, link, id);
  if (!p) return;
  const today = todayIn(link.tz);
  // Belt and braces: never save while something is still missing.
  const missing =
    !p.dayGiven ||
    (p.kind === "weight" && !p.unit) ||
    (p.kind === "gym" && p.gym && !p.forgot && !p.muscles.length) ||
    (p.kind === "food" && !p.meal) ||
    p.kind === "foodtext";
  if (missing) return ctx.answerCallbackQuery({ text: "Pick the missing details first." });
  await ctx.answerCallbackQuery({ text: "Saving…" });

  if (p.kind === "weight") {
    const w = parseWeight(String(p.value), p.unit!);
    if ("error" in w) return edit(ctx, `⚠️ ${esc(w.error)}`, MENU());
    const r = await saveWeight(link.user_id, p.day, w.kg);
    await dropPending(link.user_id, id);
    if (!r.ok) return edit(ctx, `⚠️ ${esc(r.error)}`, MENU());
    return edit(ctx, weightSaved(w.kg, p.day, today), new InlineKeyboard().text("🏋️ Gym", `g:${p.day}`).text("😴 Rest", `r:${p.day}`).text("Skip", "m:done"));
  }
  if (p.kind === "gym") {
    const r = await saveGym(link.user_id, p.day, p.gym, p.muscles);
    if (!r.ok && r.error === "NO_WEIGHT") {
      await dropPending(link.user_id, id);
      return edit(ctx, NO_WEIGHT(p.day, today), MENU());
    }
    await dropPending(link.user_id, id);
    return edit(ctx, r.ok ? gymSaved(p.day, today, p.gym, p.muscles) : `⚠️ ${esc(r.error)}`, openFit("/log"));
  }
  const r = await saveFood(link.user_id, p.day, p.meal!, p.items);
  await dropPending(link.user_id, id);
  const kcal = p.items.reduce((s, i) => s + i.kcal, 0);
  return edit(ctx, r.ok ? foodSaved(p.items.length, p.meal!, kcal) : `⚠️ ${esc(r.error)}`, new InlineKeyboard().text("📊 Today", "m:today").url("🌐 Open fit", `${fitOrigin()}/food`));
}

export function createFitBot(token = process.env.TELEGRAM_FIT_BOT_TOKEN) {
  if (!token) throw new Error("TELEGRAM_FIT_BOT_TOKEN is not set");
  const bot = new Bot(token);

  // Webhooks don't use bot.catch: catch here so a failed step still answers (and Telegram gets 200).
  bot.use(async (ctx, next) => {
    try {
      await next();
    } catch (e) {
      console.error("fit telegram bot error", e);
      if (ctx.callbackQuery) await ctx.answerCallbackQuery({ text: "Something went wrong. Try again." }).catch(() => undefined);
      else await ctx.reply("⚠️ Something went wrong. Try again in a moment.").catch(() => undefined);
    }
  });

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
    await ctx.answerCallbackQuery();
    if (what === "done") return ctx.editMessageReplyMarkup({ reply_markup: openFit() }).catch(() => undefined);
    if (what === "weight") return ctx.reply(WEIGHT_PROMPT, html);
    if (what === "food") return ctx.reply(FOOD_PROMPT, html);
    if (what === "today") return sendSummary(ctx, link);
    // Gym from the menu: which day and which muscles are both asked.
    if (what === "gym") return start(ctx, link, { kind: "gym", day: todayIn(link.tz), dayGiven: false, gym: true, muscles: [], forgot: false });
  });

  // After a weigh-in: gym or rest for that same day (the day is known).
  bot.callbackQuery(/^g:(\d{4}-\d{2}-\d{2})$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => undefined);
    return start(ctx, ctx.fitLink!, { kind: "gym", day: ctx.match[1], dayGiven: true, gym: true, muscles: [], forgot: false });
  });
  bot.callbackQuery(/^r:(\d{4}-\d{2}-\d{2})$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => undefined);
    return start(ctx, ctx.fitLink!, { kind: "gym", day: ctx.match[1], dayGiven: true, gym: false, muscles: [], forgot: false });
  });

  // Unit for a weigh-in.
  bot.callbackQuery(/^u:([0-9a-f-]{36}):(kg|lb)$/, async (ctx) => {
    const link = ctx.fitLink!;
    const p = await pendingFor(ctx, link, ctx.match[1]);
    if (!p || p.kind !== "weight") return;
    const unit = ctx.match[2] as Unit;
    const w = parseWeight(String(p.value), unit);
    if ("error" in w) return ctx.answerCallbackQuery({ text: w.error });
    return change(ctx, link, ctx.match[1], { ...p, unit });
  });

  // Day for any step.
  bot.callbackQuery(/^d:([0-9a-f-]{36}):([012])$/, async (ctx) => {
    const link = ctx.fitLink!;
    const p = await pendingFor(ctx, link, ctx.match[1]);
    if (!p) return;
    return change(ctx, link, ctx.match[1], { ...p, day: addDays(todayIn(link.tz), -Number(ctx.match[2])), dayGiven: true });
  });

  // Gym picker: toggle a muscle, or toggle "don't remember" (which clears the muscles).
  bot.callbackQuery(/^(t|f):([0-9a-f-]{36})(?::(\w+))?$/, async (ctx) => {
    const link = ctx.fitLink!;
    const [, op, id, m] = ctx.match;
    const p = await pendingFor(ctx, link, id);
    if (!p || p.kind !== "gym") return;
    if (op === "f") return change(ctx, link, id, { ...p, forgot: !p.forgot, muscles: [] });
    if (!isMuscle(m)) return ctx.answerCallbackQuery();
    const muscles: Muscle[] = p.muscles.includes(m) ? p.muscles.filter((x) => x !== m) : [...p.muscles, m];
    return change(ctx, link, id, { ...p, muscles, forgot: false });
  });

  // Food: pick the meal.
  bot.callbackQuery(/^ml:([0-9a-f-]{36}):([blsd])$/, async (ctx) => {
    const link = ctx.fitLink!;
    const p = await pendingFor(ctx, link, ctx.match[1]);
    if (!p || p.kind !== "food") return;
    return change(ctx, link, ctx.match[1], { ...p, meal: MEAL_BY_LETTER[ctx.match[2]] });
  });

  // Food without amounts: "use usual portions" runs the AI now.
  bot.callbackQuery(/^p:([0-9a-f-]{36})$/, async (ctx) => {
    const link = ctx.fitLink!;
    const id = ctx.match[1];
    const p = await pendingFor(ctx, link, id);
    if (!p || p.kind !== "foodtext") return;
    await ctx.answerCallbackQuery({ text: "Estimating…" });
    const r = await estimate(link, p);
    if (r.error) return edit(ctx, r.error, openFit("/food"));
    await updatePending(link.user_id, id, r.items!);
    const { text, kb } = render(r.items!, id, todayIn(link.tz));
    return edit(ctx, text, kb);
  });

  bot.callbackQuery(/^ok:([0-9a-f-]{36})$/, (ctx) => confirm(ctx, ctx.fitLink!, ctx.match[1]));
  bot.callbackQuery(/^x:([0-9a-f-]{36})$/, async (ctx) => {
    await dropPending(ctx.fitLink!.user_id, ctx.match[1]);
    await ctx.answerCallbackQuery({ text: "Cancelled" });
    return edit(ctx, "✖ Cancelled. Nothing was saved.", MENU());
  });

  // Any other tap (old buttons): just stop the spinner.
  bot.on("callback_query:data", (ctx) => ctx.answerCallbackQuery({ text: "That button is out of date. Send it again." }));

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
