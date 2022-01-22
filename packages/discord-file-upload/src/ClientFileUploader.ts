import FileUploader, { UploadedChunk } from "./FileUploader";
import { Channel, Client } from "@discord-s3/discord-client";
import { Readable } from "stream";
import { download } from "./defaultDownloader";
import { get } from "https";
import CustomDownloadStream from "./CustomDownloadStream";

const MAX_UPLOAD_SIZE = 8 * 1024 * 1000;

export interface ClientFileUploaderOpts {
  maxUploadSize?: number;
  token: string;
  bot?: boolean;
  channel: string;
}

export class ClientFileUploader extends FileUploader {
  private client: Client;
  private channel: Channel;

  constructor({ maxUploadSize, bot, token, channel }: ClientFileUploaderOpts) {
    super(maxUploadSize || MAX_UPLOAD_SIZE);

    this.client = new Client({
      token,
      selfbot: !bot,
    });
    this.channel = this.client.getChannel(channel);
  }

  protected async _upload(stream: Readable): Promise<string> {
    const { attachments } = await this.channel.uploadFile(stream, {
      contentType: "application/octet-stream",
      filename: "file.dat",
    });
    return attachments[0].url;
  }

  protected async _download(url: string): Promise<CustomDownloadStream> {
    return new CustomDownloadStream({
      read: () => {
        const stream = new Readable();

        get(url, (res) => {
          res.on("data", (data) => stream.push(data));
          res.on("end", () => stream.emit("end"));
        });

        return stream;
      },
      chunkSize: MAX_UPLOAD_SIZE,
    });
  }
}
