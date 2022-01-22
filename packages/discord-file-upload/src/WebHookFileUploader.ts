import FileUploader, { UploadedChunk } from "./FileUploader";
import { Readable } from "stream";
import RestManager from "@discord-s3/discord-client/dist/rest/RestManager";
import FormData from "form-data";
import { download } from "./defaultDownloader";
import CustomDownloadStream from "./CustomDownloadStream";
import { get } from "https";

const MAX_UPLOAD_SIZE = 8 * 1024 * 1000;

export interface WebHookFileUploaderOpts {
  url: string;
}

interface Response {
  attachments: {
    id: string;
    filename: string;
    size: number;
    url: string;
  }[];
}

export default class WebHookFileUploader extends FileUploader {
  private restManager: RestManager;

  private webHookToken: string;
  private webHookId: string;

  constructor({ url }: WebHookFileUploaderOpts) {
    super(MAX_UPLOAD_SIZE);

    const params = new URL(url).pathname.split("/");

    this.webHookToken = params.pop() as string;
    this.webHookId = params.pop() as string;

    this.restManager = new RestManager({});
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

  protected async _upload(stream: Readable): Promise<string> {
    const formData = new FormData({ maxDataSize: Infinity });

    formData.append(
      "payload_json",
      JSON.stringify({
        content: "_upload",
        attachments: [
          {
            id: 0,
            description: "_upload",
            filename: "data.dat",
          },
        ],
      }),
      {
        contentType: "application/json",
      }
    );

    formData.append("files[0]", stream, {
      filename: `data.dat`,
      contentType: "application/octet-stream",
    });

    const data = await this.restManager.post<Response>({
      endpoint: `/webhooks/${this.webHookId}/${this.webHookToken}`,
      body: formData,
      headers: formData.getHeaders(),
      query: {
        wait: "true",
      },
    });

    return data.attachments[0].url;
  }
}
