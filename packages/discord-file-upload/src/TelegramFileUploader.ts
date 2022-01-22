import { Readable } from "stream";
import { Api, TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import FileUploader, { UploadedChunk } from "./FileUploader";
import bigInt from "big-integer";
import CustomDownloadStream from "./CustomDownloadStream";
import MultiplePartDownloader from "./MultiplePartDownloader";

const MAX_UPLOAD_SIZE = 2 * 1000 * 1000 * 1024;

const MAX_SIMULTANEOUS_UPLOADS = 1;

const CHUNK_SIZE = 512 * 1024;

export interface TeleGramFileUploaderOpts {
  apiId: number;
  apiHash: string;
  token: string;
  chatId: number | string;
}

export default class TeleGramFileUploader extends FileUploader {
  private client: TelegramClient;
  private wait: (() => any)[] = [];
  private lock = true;
  private chatId: number | string;
  private token: string;

  public constructor({
    apiId,
    apiHash,
    token,
    chatId,
  }: TeleGramFileUploaderOpts) {
    super(MAX_UPLOAD_SIZE);
    this.client = new TelegramClient(new StringSession(token), apiId, apiHash, {
      connectionRetries: 5,
    });
    this.chatId = chatId;
    this.token = token;
    this.client.connect().then(() => {
      this.lock = false;
      console.log("lock = false");
      this.wait.forEach((a) => a());
      this.wait = [];
    });
  }

  public isEqual(settings: TeleGramFileUploaderOpts): boolean {
    return this.token === settings.token && this.chatId === settings.chatId;
  }

  public waitLock() {
    return new Promise((resolve) => {
      console.log("this.lock ", this.lock);
      if (!this.lock) {
        return resolve(null);
      } else {
        this.wait.push(() => resolve(null));
      }
    });
  }

  protected async _download(messageId: string): Promise<CustomDownloadStream> {
    await this.waitLock();
    const { messages } = (await this.client.invoke(
      new Api.messages.GetMessages({
        id: [new Api.InputMessageID({ id: Number(messageId) })],
      })
    )) as any;
    const media = messages[0].media;
    const readable = new CustomDownloadStream({
      read: async (start, end) => {
        console.info("TelegramFileUploader # downloading %d-%d", start, end);
        const a = await this.client.downloadMedia(media, {
          start,
          end: end - 1,
          workers: 1,
        });
        console.log("TelegramFileUploader # downloaded %d bytes", a.length);
        return a;
      },
      chunkSize: 512 * 1024,
    });
    readable.end();

    return readable;
  }

  protected _upload(stream: Readable): Promise<string> {
    let fileTotalParts = 0;
    let currentIndex = 0;

    let currentUploading = 0;

    let currentBuffer: Buffer | null = null;

    const parts: Buffer[] = []; // todo find a way to avoid storing whole stream (max 2GB) in memory

    stream.pause();
    return new Promise(async (resolve) => {
      await this.waitLock();

      //await this.client.connect();

      let totalSize = 0;

      const fileId = bigInt.randBetween("-1e100", "1e100");

      const onUploadingEnd = async () => {
        const res = await this.client.sendFile(this.chatId, {
          file: new Api.InputFileBig({
            id: fileId,
            parts: fileTotalParts,
            name: `_upload_${Date.now()}`,
          }),
          fileSize: totalSize,

          workers: 1,
        });
        console.log("Telegram Saved file id(%s)", res.id?.toString());

        resolve(res.id?.toString());
      };

      const uploadPart = async (partIndex: number, bytes: Buffer) => {
        console.log("will upload index %d (%d bytes)", partIndex, bytes.length);
        currentUploading++;

        uploadNext();

        const res = await this.client.invoke(
          new Api.upload.SaveBigFilePart({
            fileId,
            filePart: partIndex,
            fileTotalParts,
            bytes,
          })
        );
        console.log("uploaded %d", bytes.length);
        console.log("response ", res);
        currentUploading--;
        if (parts.length === 0 && currentUploading === 0) {
          onUploadingEnd();
        } else {
          uploadNext();
        }
      };

      function uploadNext() {
        if (currentUploading < MAX_SIMULTANEOUS_UPLOADS) {
          console.log(
            "total size in array %d bytes",
            parts.reduce((acc, i) => acc + i.length, 0)
          );
          const bytes = parts.shift();

          if (bytes) uploadPart(currentIndex++, bytes);
        }
      }

      function onStreamEnd() {
        if (currentBuffer) {
          parts.push(currentBuffer);
          currentBuffer = null;
        }

        fileTotalParts = parts.length;
        uploadNext();
      }

      let streamTimeout: any;

      function createStreamEndTimeout() {
        streamTimeout = setTimeout(() => {
          if ((stream as any)._ended) {
            onStreamEnd();
          } else {
            createStreamEndTimeout();
          }
        }, 500);
      }

      stream.on("data", (d: Buffer) => {
        clearTimeout(streamTimeout);
        totalSize += d.length;

        currentBuffer = currentBuffer ? Buffer.concat([currentBuffer, d]) : d;
        if (currentBuffer && currentBuffer?.length >= CHUNK_SIZE) {
          do {
            let diff: number = currentBuffer!.length - CHUNK_SIZE;
            let tmpBuffer =
              diff === 0
                ? currentBuffer!
                : currentBuffer!.subarray(0, CHUNK_SIZE);
            parts.push(tmpBuffer);
            console.log(parts.map((part) => part.length));
            fileTotalParts++;
            currentBuffer =
              diff === 0 ? null : currentBuffer!.subarray(CHUNK_SIZE);
          } while (currentBuffer && currentBuffer?.length >= CHUNK_SIZE);
        }
        /*if (currentBuffer && currentBuffer.length + d.length > maxSize) {
        let diff = currentBuffer.length + d.length - maxSize;
        console.log("diff %d", diff);
        console.log(
          "currentBuffer.length %d | d.length %d",
          currentBuffer.length,
          d.length
        );
        let tmpBuffer = Buffer.concat([
          currentBuffer,
          d.subarray(0, d.length - diff),
        ]);
        console.log("tmpBuffer.length %d", tmpBuffer.length);
        uploadPart(tmpBuffer);
        currentBuffer = d.subarray(d.length - diff);
        return;
      } */
        createStreamEndTimeout();
      });

      stream.resume();
    });
  }
}
