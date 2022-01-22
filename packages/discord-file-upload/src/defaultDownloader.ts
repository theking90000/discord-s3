import { createDecipheriv } from "crypto";
import { Readable, Stream } from "stream";
import { UploadedChunk } from "./FileUploader";
import https from "https";
import { IncomingMessage } from "http";

export function decrypt(stream: Stream, password: string, iv: string) {
  const decryptStream = createDecipheriv(
    "aes-256-cbc",
    Buffer.from(password, "hex"),
    Buffer.from(iv, "hex")
  );
  stream.pipe(decryptStream);
  return decryptStream;
}

export function download(url: string): Promise<IncomingMessage> {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      resolve(res);
    });
  });
}

export async function process(
  parts: UploadedChunk[],
  stream: Readable,
  _download: (chunk: UploadedChunk) => Promise<Readable> = (chunk) =>
    download(chunk.downloadUrl),
  read: (read: (size?: number) => any) => void,
  lock: (b: boolean) => void
) {
  let partsStreams: Readable[] = Array(parts.length);

  async function getStream(part: UploadedChunk) {
    let initialIndex = parts.indexOf(part);
    if (!partsStreams[initialIndex]) {
      partsStreams[initialIndex] = await _download(part);
    }
    return partsStreams[initialIndex];
  }

  function isProcessing(part: UploadedChunk) {
    return !!partsStreams[parts.indexOf(part)];
  }

  function isLastPart(part: UploadedChunk) {
    return parts.length - 1 === parts.indexOf(part);
  }

  function nextPart(part: UploadedChunk) {
    return parts[parts.indexOf(part) + 1];
  }

  let part = parts[0];
  let total = 0;
  let partSizeProcessed = 0;

  read(async (size?: number) => {
    total += size || 0;
    if (!isProcessing(part)) {
      lock(false);
      let nStream: Readable = await getStream(part);
      if (part.encryptionKey && part.iv) {
        nStream = decrypt(nStream, part.encryptionKey, part.iv);
      }
      nStream.on("data", (data) => {
        stream.push(data);
        partSizeProcessed += data.length;
        if (partSizeProcessed === part.bytesRangeEnd - part.bytesRangeStart) {
          partSizeProcessed = 0;
          if (isLastPart(part)) {
            stream.emit("end");
          } else part = nextPart(part);
        }
      });
    }
  });

  parts = parts.sort((a, b) => a.bytesRangeStart - b.bytesRangeStart);
}

export function downloadAllChunks(
  parts: UploadedChunk[],
  _download: (chunk: UploadedChunk) => Promise<Readable>
): Readable {
  let requestRead: (size?: number) => any;
  let wait: any[] = [];
  let lock = false;
  let stream = new Readable({
    read: (size) => {
      if (!requestRead || lock) {
        wait.push((x: any) => x(size));
      } else {
        requestRead(size);
      }
    },
  });
  process(
    parts,
    stream,
    _download,
    (a) => {
      let w = wait;
      wait = [];
      w.forEach((b) => b(a));
      requestRead = a;
    },
    (b) => {
      if (b === false && wait.length > 0) {
        let w = wait;
        wait = [];
        w.forEach((a) => a(requestRead));
      }
      lock = b;
    }
  );
  return stream;
}
