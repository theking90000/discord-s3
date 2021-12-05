import WebHookFileUploader from "./WebHookFileUploader";
import {ClientFileUploader} from "./ClientFileUploader";

interface GetFileUploaderOpts {
    token?: string;
    bot?: boolean;
    webhook?: string;
    channel?: string;
}

export const getFileUploader = ({bot, token, webhook, channel}: GetFileUploaderOpts) => {
    if (webhook) {
        return new WebHookFileUploader({url: webhook})
    }
    if (token && channel) {
        return new ClientFileUploader({
            token,
            channel,
            bot
        })
    }
    throw new Error("")
}

getFileUploader({
    bot: true,
    channel: "917085031065870366",
    token: process.env.TOKEN
})
    /*getFileUploader({
    webhook: process.env.WEBHOOK
})*/
    .uploadFile("/home/theking90000/Vidéos/Caracal Gregory Loves Being Brushed  - Big Floppa [p4qeOiLP7So].webm")
    .then(console.log)
    .catch(console.error)
