import "server-only";
import { saveEntryFor } from "../entries";
import { buildShareCard, type ShareKind } from "../share-cards";
import { db, loadCreator, siteOrigin, todayIn, type Creator } from "../telegram/data";
import { interpretMessage } from "../telegram/groq";
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
} from "../telegram/messages";
import { parseLogMessage, type ParsedLog } from "../telegram/parse";
import { sendButtons, sendLinkButton, sendList, sendText, showTyping, type Button } from "./api";
import { getLink, redeemLinkToken, stopReminders, unlink, type WaLink } from "./data";
import { toWhatsApp, type Inbound } from "./webhook";

/**
 * The progresshub WhatsApp bot: the Telegram bot's features and wording over WhatsApp's controls.
 * A list replaces the 6-button menu (reply buttons cap at 3), and a link button replaces
 * "Post on X" + "Copy link" (the share link goes in the message so it can be long-pressed).
 */

const MENU_ROWS: Button[] = [
  { id: "m:log", title: "📝 Log today" },
  { id: "m:progress", title: "📈 My progress" },
  { id: "m:rank", title: "🏆 My rank" },
  { id: "m:streak", title: "🔥 Streak" },
  { id: "m:milestones", title: "🎯 Milestones" },
  { id: "m:share", title: "🔗 Share on X" },
];
const MENU_ROW: Button = { id: "m:menu", title: "☰ Menu" };

const STATS = new Set<string>(["progress", "rank", "streak", "milestones"]);

/** WhatsApp has no slash menu, so plain words (and template quick-replies) work as commands. */
const COMMANDS: Record<string, string> = {
  menu: "m:menu",
  start: "m:menu",
  help: "m:menu",
  hi: "m:menu",
  hello: "m:menu",
  log: "m:log",
  "log now": "m:log",
  "log today": "m:log",
  progress: "m:progress",
  "my progress": "m:progress",
  rank: "m:rank",
  "my rank": "m:rank",
  streak: "m:streak",
  milestones: "m:milestones",
  share: "m:share",
};

const LINK_RE = /^\/?(?:link|connect|start)\s+([\w-]{32})$/i;

// Old messages stay tappable on WhatsApp (they can't be edited away), so a Save button expires.
const CONFIRM_TTL_MS = 15 * 60_000;

const sendMenu = (to: string, html: string) => sendList(to, toWhatsApp(html), "Open menu", MENU_ROWS);

/** A stat with its Post on X button, or the menu when it can't be shared. */
async function sendShareable(to: string, c: Creator, kind: ShareKind, html: string, opts?: Parameters<typeof shareLinks>[2], privateNote = true) {
  if (!c.handle || !c.isPublic) return sendMenu(to, privateNote ? html + PRIVATE_NOTE : html);
  const links = shareLinks(c, kind, opts);
  if (!links) return sendMenu(to, html);
  return sendLinkButton(to, `${toWhatsApp(html)}\n\n🔗 ${links.url}`, "Post on X", links.intent, "Reply menu for more options");
}

async function sendStat(to: string, c: Creator, kind: StatKind) {
  const text = statText(kind, c);
  return c.latest ? sendShareable(to, c, shareKindFor[kind], text) : sendMenu(to, text);
}

function sendShareMenu(to: string, c: Creator) {
  const rows = (Object.entries(SHARE_LABELS) as [ShareKind, string][])
    .filter(([kind]) => buildShareCard(kind, c).available)
    .map(([kind, title]) => ({ id: `s:${kind}`, title }));
  if (!rows.length) return sendMenu(to, NOTHING_TO_SHARE);
  return sendList(to, SHARE_PROMPT, "Choose a card", [...rows, MENU_ROW]);
}

async function confirmLog(to: string, c: Creator, parsed: ParsedLog) {
  const reply = confirmReply(c, parsed);
  if (!reply.ok) return sendMenu(to, reply.text);
  return sendButtons(to, toWhatsApp(reply.text), [
    { id: `save:${reply.date}:${reply.total}:${Date.now()}`, title: "✅ Save" },
    { id: "x", title: "✖ Cancel" },
  ]);
}

async function handleSave(to: string, link: WaLink, date: string, total: number) {
  const before = await loadCreator(link);
  if (!before) return sendText(to, LOAD_FAILED);
  const bestBefore = bestExcluding(before, date);

  const result = await saveEntryFor(db(), link.user_id, date, total, todayIn(link.tz));
  if (!result.ok) return sendMenu(to, `⚠️ ${esc(result.error)}`);

  const c = await loadCreator(link);
  const { text, crossed } = savedReply(c, date, total, result.created, bestBefore);
  return crossed && c ? sendShareable(to, c, "milestone", text) : sendMenu(to, text);
}

async function handleAction(to: string, link: WaLink, action: string) {
  if (action === "x") return sendMenu(to, CANCELLED);
  if (action === "m:menu") return sendMenu(to, MENU_PROMPT);
  if (action === "m:log") return sendText(to, toWhatsApp(LOG_PROMPT));

  const save = action.match(/^save:(\d{4}-\d{2}-\d{2}):(\d+):(\d+)$/);
  if (save) {
    if (Date.now() - Number(save[3]) > CONFIRM_TTL_MS) return sendMenu(to, "That confirmation expired. Send the number again.");
    return handleSave(to, link, save[1], Number(save[2]));
  }

  const c = await loadCreator(link);
  if (!c) return sendText(to, LOAD_FAILED);
  if (action === "m:share") return sendShareMenu(to, c);

  const [prefix, name] = action.split(":");
  if (prefix === "m" && STATS.has(name)) return sendStat(to, c, name as StatKind);
  if (prefix === "s" && name in SHARE_LABELS) {
    const kind = name as ShareKind;
    return sendShareable(to, c, kind, `${SHARE_LABELS[kind]} card ready.\n\n<i>${esc(buildShareCard(kind, c).postText)}</i>`);
  }
}

/** A clean log is read by code with no LLM call; anything else is classified by Groq. */
async function handleText(to: string, link: WaLink, text: string, messageId: string) {
  const c = await loadCreator(link);
  if (!c) return sendText(to, LOAD_FAILED);

  const direct = parseLogMessage(text, c.today);
  if (direct) return confirmLog(to, c, direct);

  await showTyping(messageId);
  const intent = await interpretMessage(text, c.today);
  switch (intent?.kind) {
    case "log":
      return confirmLog(to, c, intent.log);
    case "eta": {
      const { text: reply, share } = etaReply(c);
      return share ? sendShareable(to, c, "progress", reply) : sendMenu(to, reply);
    }
    case "target": {
      const { text: reply, share } = targetReply(c, intent.date);
      return share ? sendShareable(to, c, "target", reply, { target: intent.date }, false) : sendMenu(to, reply);
    }
    case "progress":
    case "rank":
    case "streak":
    case "milestones":
      return sendStat(to, c, intent.kind);
    case "share":
      return sendShareMenu(to, c);
    case "help":
      return sendMenu(to, HELP);
    default:
      return sendMenu(to, OFF_TOPIC);
  }
}

export async function handleInbound({ from, messageId, text, action }: Inbound) {
  const typed = text?.trim() ?? "";
  const code = typed.match(LINK_RE)?.[1];
  if (code) {
    const linked = await redeemLinkToken(code, from);
    if (!linked) return sendText(from, "That connect link expired. Open progresshub → Connect to get a fresh one.");
    return sendMenu(from, linkedText(linked.handle));
  }

  const link = await getLink(from);
  if (!link) {
    return sendLinkButton(
      from,
      toWhatsApp("👋 This number isn't linked yet.\n\nOpen <b>progresshub → Connect</b> and tap the button there. It brings you back here, linked."),
      "Open progresshub",
      `${siteOrigin()}/connect`,
    );
  }

  if (action) return handleAction(from, link, action);

  const word = typed.toLowerCase().replace(/^\//, "");
  if (word === "unlink") {
    await unlink(from);
    return sendText(from, "Unlinked. This chat won't get reminders or show your stats anymore.");
  }
  if (word === "stop") {
    await stopReminders(from);
    return sendText(from, "Reminders are off. Turn them back on in progresshub → Connect.");
  }
  if (COMMANDS[word]) return handleAction(from, link, COMMANDS[word]);
  return handleText(from, link, typed, messageId);
}
