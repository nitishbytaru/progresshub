"use client";

import { Send } from "lucide-react";
import { BotCard } from "./bot-card";
import { createTelegramLink, disconnectTelegram, setTelegramReminders } from "./telegram-actions";

type Props = {
  link: { remind: boolean; linkedAt: string } | null;
  botUsername: string | null;
};

export function TelegramCard({ link, botUsername }: Props) {
  return (
    <BotCard
      id="telegram"
      channel="Telegram"
      icon={Send}
      doneLabel="I tapped Start"
      link={link}
      openUrl={botUsername ? `https://t.me/${botUsername.replace(/^@/, "")}` : null}
      connectAction={createTelegramLink}
      remindAction={setTelegramReminders}
      disconnectAction={disconnectTelegram}
    />
  );
}
