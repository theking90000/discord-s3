import Client from "./Client";
import {Readable} from "stream";
import FormData from "form-data";

export interface Message {
    id: string;
    attachments: {
        id: string,
        filename: string,
        size: number,
        url: string,
    }[]
}

export default class Channel {

    private id: string;
    private client: Client


    constructor(id: string, client: Client) {
        this.id = id;
        this.client = client;
    }

    public async uploadFile(stream: Readable, opts: { filename: string; contentType: string }) {

        const formData = new FormData({maxDataSize: Infinity})

        formData.append("files[0]", stream, opts)
        formData.append("payload_json", JSON.stringify({
            content: "",
            nonce: Date.now(),
            type: 0,
            sticker_ids: [],
            attachments: [{
                id: "0",
                filename: opts.filename
            }]
        }))

        return await this.client.getRestManager().post<Message>({
            endpoint: `/channels/${this.id}/messages`,
            body: formData,
            headers: formData.getHeaders()
        });

    }

}
