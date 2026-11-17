/**
 * Run the fit Telegram bot locally with long polling (no public URL or webhook needed):
 *   npm run fitbot:dev
 * Polling removes the bot's webhook, so this only runs on a separate test bot
 * (TELEGRAM_FIT_DEV_BOT_TOKEN in .env.local). Using the live token would take the production bot offline.
 */
import { createFitBot } from "../src/lib/fit-telegram/bot";

async function main() {
  const devToken = process.env.TELEGRAM_FIT_DEV_BOT_TOKEN;
  if (!devToken) throw new Error("Set TELEGRAM_FIT_DEV_BOT_TOKEN in .env.local to a separate test bot's token (create one with @BotFather).");
  if (devToken === process.env.TELEGRAM_FIT_BOT_TOKEN) {
    throw new Error("TELEGRAM_FIT_DEV_BOT_TOKEN is the live fit bot's token. Polling would remove the production webhook, so use a separate test bot.");
  }
  const bot = createFitBot(devToken);
  await bot.api.deleteWebhook();
  console.log("progresshub fit test bot polling… (Ctrl+C to stop)");
  await bot.start({ onStart: (me) => console.log(`@${me.username} is live`) });
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
