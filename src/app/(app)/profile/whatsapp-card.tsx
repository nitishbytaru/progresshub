"use client";

import { MessageCircle } from "lucide-react";
import { BotCard } from "./bot-card";
import { createWhatsAppLink, disconnectWhatsApp, setWhatsAppReminders } from "./whatsapp-actions";

type Props = {
  link: { remind: boolean; linkedAt: string } | null;
  number: string | null;
};

export function WhatsAppCard({ link, number }: Props) {
  return (
    <BotCard
      id="whatsapp"
      channel="WhatsApp"
      icon={MessageCircle}
      doneLabel="I sent the message"
      link={link}
      openUrl={number ? `https://wa.me/${number.replace(/\D/g, "")}` : null}
      connectAction={createWhatsAppLink}
      remindAction={setWhatsAppReminders}
      disconnectAction={disconnectWhatsApp}
    />
  );
}
