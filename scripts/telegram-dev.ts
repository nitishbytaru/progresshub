/**
 * Run the Telegram bot locally with long polling (no public URL or webhook needed):
 *   npx tsx --env-file=.env.local --conditions=react-server scripts/telegram-dev.ts
 * `--conditions=react-server` lets the server-only modules load outside Next.
 * Polling and a webhook can't run at the same time: this removes the webhook first.
 * Use a separate test bot token if the live site's webhook must stay up.
 */
import { createBot } from "../src/lib/telegram/bot";

async function main() {
  const bot = createBot();
  await bot.api.deleteWebhook();
  console.log("progresshub bot polling… (Ctrl+C to stop)");
  await bot.start({ onStart: (me) => console.log(`@${me.username} is live`) });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
