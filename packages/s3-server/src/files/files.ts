import { getFileUploader } from "@discord-s3/discord-file-upload";
import { ReadStream } from "fs";
import { ObjectPart } from "../models/ObjectPart";

export async function uploadFilePart({
  _id,
  stream,
}: {
  _id: string;
  stream: ReadStream;
}) {
  const fileUploader = getFileUploader({
    // todo dynamic settings
    webhook: process.env.WEBHOOK_URL,
  }) as any;

  const parts = await fileUploader.upload(stream, {
    encrypt: true,
  });

  for (const part of parts) {
    await new ObjectPart({
      ...part,
      object: _id,
    }).save!();
  }

  return parts;
}
