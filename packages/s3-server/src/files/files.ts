import { getFileUploader } from "@discord-s3/discord-file-upload";
import { ReadStream } from "fs";
import TeleGramFileUploader from "@discord-s3/discord-file-upload/dist/TelegramFileUploader";
import { ObjectPart } from "../models/ObjectPart";
import { SourceProvider } from "../models/SourceProvider";

export function getUploader(provider: SourceProvider) {
  return getFileUploader({
    bot: true,
    channel: provider.discordChannelId,
    telegramOpts: provider.telegramInfos
      ? {
          apiHash: process.env.TELEGRAM_API_HASH as string,
          apiId: Number(process.env.TELEGRAM_API_ID),
          chatId: "me" as any,
          token: provider.telegramInfos.session,
        }
      : undefined,
    token: provider?.discordBotToken,
    webhook: provider?.discordWebhook,
  });
}

export async function uploadFilePart({
  _id,
  stream,
  provider,
}: {
  _id: string;
  stream: ReadStream;
  provider: SourceProvider;
}) {
  const fileUploader = getUploader(provider);

  if ((fileUploader as any)?.waitLock) {
    await (fileUploader as any)?.waitLock();
  }
  const parts = await fileUploader.upload(stream, {
    encrypt: false,
  });

  for (const part of parts) {
    await new ObjectPart({
      ...part,
      object: _id,
    }).save!();
  }

  return parts;
}
