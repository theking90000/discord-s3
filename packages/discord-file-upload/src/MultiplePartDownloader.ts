import { Readable } from "stream";
import CustomDownloadStream from "./CustomDownloadStream";
import { UploadedChunk } from "./FileUploader";
import Lockable from "./Lockable";

type Downloadable = (chunkUrl: string) => Promise<CustomDownloadStream>;

export default class MultiplePartDownloader extends Lockable {
  private chunks: UploadedChunk[];
  private download: Downloadable;

  constructor(chunks: UploadedChunk[], download: Downloadable) {
    super();
    this.chunks = chunks;
    this.download = download;
  }

  private getChunks(start: number, end: number) {
    let final = [];

    for (let i = 0; i < this.chunks.length; i++) {
      let chunk = this.chunks[i];
      //console.log(chunk.bytesRangeStart+ " start "+ start)
      //console.log(chunk.bytesRangeEnd+ " end "+ end)
      if (
        chunk.bytesRangeStart < start &&
        this.chunks[i + 1] &&
        this.chunks[i + 1].bytesRangeStart < start
      )
        continue;

      if (
        chunk.bytesRangeEnd > end &&
        this.chunks[i - 1] &&
        this.chunks[i - 1].bytesRangeEnd > end
      )
        continue;

      final.push(chunk);
    }
    return final;
  }

  public getStream() {
    const startReader = async (
      start: number,
      end: number,
      stream: Readable
    ) => {
      await this.useLock();
      this.lock();
      const chunks = this.getChunks(start, end);

      for (const chunk of chunks) {
        if (stream.destroyed) return;
        await new Promise<void>(async (resolve) => {
          try {
            const chunkDownloader = await this.download(chunk.downloadUrl);
            stream.on("close", () => chunkDownloader.destroy());
            chunkDownloader.on("data", (d) => {
              stream.push(d);
            });
            chunkDownloader.on("end", () => resolve());
            chunkDownloader.streamFrom(
              Math.max(start, chunk.bytesRangeStart),
              Math.min(end, chunk.bytesRangeEnd)
            );
            chunkDownloader.end();
          } catch (e) {
            console.error(e);
          }
        });
      }
      this.unLock();
    };
    let first = true;
    return new CustomDownloadStream({
      read: (start, end) => {
        return new Readable({
          async read() {
            if (first) {
              first = false;
              startReader(start, end, this).then(() => {
                this.emit("end");
              });
            }
          },
        });
      },
    });
  }
}
