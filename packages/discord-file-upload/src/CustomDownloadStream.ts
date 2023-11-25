import { emit } from "process";
import { Readable } from "stream";

export interface CustomDownloadStreamOpts {
  read: ReadFn;
  chunkSize?: number;
}

type ReadFn = (start: number, end: number) => Promise<Buffer> | Readable;

type waitAcc = () => void;

export default class CustomDownloadStream extends Readable {
  private readBytes: ReadFn;
  private ended = false;
  private shouldEnd = false;
  private closed = false;
  private isLocked = false;
  private wait: waitAcc[] = [];
  private chunkSize: number | undefined;

  constructor({ read, chunkSize }: CustomDownloadStreamOpts) {
    super({ read: () => {} });
    this.readBytes = read;
    this.chunkSize = chunkSize;
    this.on("close", () => {
      console.log("close");
      //this.closed = true;
    });
  }

  private useLock(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isLocked) {
        resolve();
      } else {
        this.wait.push(() => resolve());
      }
    });
  }

  private lock() {
    this.isLocked = true;
  }

  private unLock() {
    if (this.isLocked) {
      let fn = this.wait.shift();
      this.isLocked = false;
      if (fn) fn();
      this.unLock();
    }
  }

  public checkEnd() {
    console.log("checkEnd ", this.shouldEnd);
    if (this.shouldEnd && this.wait.length === 0) {
      console.log("end!");
      this.emit("end");
      // this.end();
    }
  }

  private async downloadChunk(
    start: number,
    end: number,
    push: (data: Buffer) => void
  ): Promise<void> {
    return new Promise(async (resolve) => {
      const data = this.readBytes(start, end);

      if ((data as Readable).on) {
        (data as Readable).on("data", (d) => {
          if (this.closed) {
            (data as Readable).destroy();
          }
          push(d);
        });

        (data as Readable).on("end", () => {
          console.log("end!!!");
          resolve();
        });
      } else {
        push((await data) as Buffer);
        resolve();
      }
    });
  }

  public streamFrom(start: number, end: number) {
    const thisStream = this;
    this.useLock().then(async () => {
      this.lock();
      let chunks: { start: number; end: number }[] = [];
      if (this.chunkSize) {
        let chunkBegin = start - (start % this.chunkSize);
        console.log("chunkBegin " + chunkBegin);
        while (chunkBegin < end) {
          chunks.push({
            start: Math.max(chunkBegin, start),
            end: Math.min((chunkBegin += this.chunkSize), end),
          });
        }
      } else {
        chunks.push({ start, end });
      }

      for (const chunk of chunks) {
        let currentBytesStreamed = 0;
        let first = false;
        let bufferAcc: Buffer | undefined;
        if (this.closed) {
          return;
        }
        console.log("Will process ", chunk);
        await this.downloadChunk(
          chunk.start /* - start */,
          chunk.end /* - chunk.start */,
          (data) => {
            currentBytesStreamed += data.length;
            /*console.log(
            "downloadChunk (%d-%d) | %d (+%d)",
            chunk.start,
            chunk.end,
            currentBytesStreamed,
            data.length
          ); */
            let diff = start - chunk.start;
            let diffEnd = end - chunk.start;

            // console.log("diffEnd %d", diffEnd);
            // console.log(chunk);
            // console.log(`end ${end} - chunk.start ${chunk.start}`);
            console.log(currentBytesStreamed + " - " + diff);
            if (currentBytesStreamed >= diff) {
              if (diff < 0) diff = 0;
              if (diffEnd < 0 || diffEnd === diff) diffEnd = chunk.end;
              if (!first) {
                first = true;
                console.log("push (with diff %d, diffEnd %d)", diff, diffEnd);
                console.log(
                  (bufferAcc
                    ? bufferAcc.subarray(diff, diffEnd)
                    : data.subarray(diff, diffEnd)
                  ).length
                );
                try {
                  thisStream.push(
                    bufferAcc
                      ? bufferAcc.subarray(diff, diffEnd)
                      : data.subarray(diff, diffEnd)
                  );
                } catch (e) {
                  console.error(e);
                }
                bufferAcc = undefined;
              } else {
                thisStream.push(data);
              }
            } else if (!first)
              bufferAcc = bufferAcc ? Buffer.concat([bufferAcc, data]) : data;
          }
        );
        //currentBytesStreamed = 0;
      }
      this.checkEnd();
      this.unLock();
    });
  }

  public end() {
    if (!this.ended) this.shouldEnd = true;
  }
}
