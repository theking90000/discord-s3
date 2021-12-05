import {createReadStream, ReadStream} from "fs";
import {Duplex, Readable} from "stream";
import duplexify from "duplexify";


export interface UploadedChunk {
    bytesRangeStart: number;
    bytesRangeEnd: number;
    downloadUrl: string;
}

export default abstract class FileUploader {

    private maxUploadSize: number;

    protected constructor(maxUploadSize: number) {
        this.maxUploadSize = maxUploadSize;
    }

    protected abstract _upload(stream: Readable): Promise<string>;

    public async upload(stream: ReadStream): Promise<UploadedChunk[]> {
        return new Promise(async (resolve) => {
            let size = 0, totalSize = 0, dest: Duplex | null = null;
            const chunks: Promise<UploadedChunk>[] = []
            stream
                .on('data', (data) => {
                    size += data.length;
                    totalSize += data.length;

                    if (size > this.maxUploadSize) {
                        dest?.emit("end");
                        dest = null;
                        size = 0;
                    }
                    if (!dest) {
                        dest = duplexify()

                        chunks.push(new Promise<UploadedChunk>(r => {
                            let sizeCp = totalSize - data.length;
                            let s = 0;

                            (dest as Readable).on('data', (d) => {
                                s += d.length;
                            })

                            this._upload(dest as Readable)
                                .then((downloadUrl) => {
                                    r({
                                        bytesRangeStart: sizeCp,
                                        bytesRangeEnd: sizeCp + s,
                                        downloadUrl
                                    })
                                })
                        }));
                    }

                    dest?.emit("data", data)
                })
                .on("end", async () => {
                    dest?.emit("end");
                    resolve(await Promise.all(chunks))
                })
        })
    }


    public async uploadFile(path: string) {
        return this.upload(createReadStream(path))
    }

}