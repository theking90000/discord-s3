import { createReadStream, ReadStream } from "fs";
import { Duplex, Readable, Stream, Transform } from "stream";
import duplexify from "duplexify";
import { createCipheriv, randomBytes } from "crypto";
import { downloadAllChunks } from "./defaultDownloader";
import CustomDownloadStream from "./CustomDownloadStream";
import MultiplePartDownloader from "./MultiplePartDownloader";

export interface UploadedChunk {
  bytesRangeStart: number;
  bytesRangeEnd: number;
  downloadUrl: string;
  encryptionKey?: string;
  iv?: string;
}

export interface UploadOptions {
  encrypt?: boolean;
}

export default abstract class FileUploader {
  private maxUploadSize: number;

  protected constructor(maxUploadSize: number) {
    this.maxUploadSize = maxUploadSize;
  }

  protected abstract _upload(stream: Readable): Promise<string>;

  protected abstract _download(url: string): Promise<CustomDownloadStream>;

  public download(chunks: UploadedChunk[]): CustomDownloadStream {
    return new MultiplePartDownloader(chunks, (chunk) =>
      this._download(chunk)
    ).getStream();
    /*return downloadAllChunks(chunks, (chunk) =>
      this._download(chunk.downloadUrl)
    );*/
  }

  public async upload(
    stream: ReadStream,
    opts?: UploadOptions
  ): Promise<UploadedChunk[]> {
    return new Promise(async (resolve) => {
      let size = 0,
        totalSize = 0,
        dest: Duplex | null = null;
      const chunks: Promise<UploadedChunk>[] = [];
      stream
        .on("data", (data) => {
          size += data.length;
          totalSize += data.length;
          console.log(totalSize);
          if (size > this.maxUploadSize) {
            console.log("emit end");
            //dest?.end();
            dest?.emit("end");
            (dest as any)._ended = true;
            dest = null;
            size = 0;
          }
          if (!dest) {
            dest = duplexify();

            chunks.push(
              new Promise<UploadedChunk>((r) => {
                let sizeCp = totalSize - data.length;
                let s = 0;
                let password: Buffer | null = null,
                  iv: Buffer,
                  encryptStream;

                if (opts?.encrypt) {
                  password = randomBytes(32);
                  iv = randomBytes(16);
                  encryptStream = createCipheriv("aes-256-cbc", password, iv);
                  dest
                    ?.pipe(
                      new Transform({
                        transform(chunk, encoding, callback) {
                          s += chunk.length;
                          this.push(chunk);
                          callback();
                        },
                      })
                    )
                    .pipe(encryptStream);
                } else {
                  dest?.on("data", (chunk) => {
                    s += chunk.length;
                  });
                }

                let encryptionKey = password?.toString("hex") || undefined;

                this._upload(encryptStream || (dest as Readable)).then(
                  (downloadUrl) => {
                    r({
                      bytesRangeStart: sizeCp,
                      bytesRangeEnd: sizeCp + s,
                      downloadUrl,
                      encryptionKey,
                      iv: iv?.toString("hex"),
                    });
                  }
                );
              })
            );
          }

          dest?.push(data);
        })
        .on("end", async () => {
          console.log("sending end");
          dest?.end();
          dest?.emit("end");
          (dest as any)._ended = true;
          resolve(await Promise.all(chunks));
        });
    });
  }

  public async uploadFile(path: string) {
    return this.upload(createReadStream(path));
  }
}
