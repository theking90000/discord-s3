import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

export function getTelegramClient(session = "") {
  const sessionString = new StringSession(session);
  return new TelegramClient(
    sessionString,
    Number(process.env.TELEGRAM_API_ID),
    process.env.TELEGRAM_API_HASH as string,
    {
      connectionRetries: 10,
      useWSS: false,
    }
  );
}

export function getTelegramCredentials() {
  return {
    apiId: Number(process.env.TELEGRAM_API_ID),
    apiHash: process.env.TELEGRAM_API_HASH as string,
  };
}
