/**
 * Run the Telegram bot locally with long polling (no public URL or webhook needed):
 *   npm run bot:dev
 * `--conditions=react-server` lets the server-only modules load outside Next.
 *
 * Polling needs the bot's webhook removed, so this only ever runs on a separate test bot
 * (TELEGRAM_DEV_BOT_TOKEN in .env.local, made with @BotFather). Using the live token here
 * would silently take the production bot offline.
 */
import { createBot } from "../src/lib/telegram/bot";

async function main() {
  const devToken = process.env.TELEGRAM_DEV_BOT_TOKEN;
  if (!devToken) {
    throw new Error("Set TELEGRAM_DEV_BOT_TOKEN in .env.local to a separate test bot's token (create one with @BotFather).");
  }
  if (devToken === process.env.TELEGRAM_BOT_TOKEN) {
    throw new Error("TELEGRAM_DEV_BOT_TOKEN is the live bot's token. Polling would remove the production webhook, so use a separate test bot.");
  }

  const bot = createBot(devToken);
  await bot.api.deleteWebhook();
  console.log("progresshub test bot polling… (Ctrl+C to stop)");
  await bot.start({ onStart: (me) => console.log(`@${me.username} is live`) });
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
