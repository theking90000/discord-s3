import { createReadStream, ReadStream } from "fs";
import { Duplex, Readable, Transform } from "stream";
import duplexify from "duplexify";
import { createCipheriv, randomBytes } from "crypto";

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

          if (size > this.maxUploadSize) {
            dest?.emit("end");
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

          dest?.emit("data", data);
        })
        .on("end", async () => {
          dest?.emit("end");
          resolve(await Promise.all(chunks));
        });
    });
  }

  public async uploadFile(path: string) {
    return this.upload(createReadStream(path));
  }
}
