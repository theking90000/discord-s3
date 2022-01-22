import WebHookFileUploader from "./WebHookFileUploader";
import { ClientFileUploader } from "./ClientFileUploader";
import FileUploader from "./FileUploader";
import TeleGramFileUploader, {
  TeleGramFileUploaderOpts,
} from "./TelegramFileUploader";

interface GetFileUploaderOpts {
  token?: string;
  bot?: boolean;
  webhook?: string;
  channel?: string;
  telegramOpts?: TeleGramFileUploaderOpts;
}

let currentWebHookUploader: FileUploader, currentFileUploader: FileUploader;

let telegram: TeleGramFileUploader[] = [];

export const getFileUploader = ({
  bot,
  token,
  webhook,
  channel,
  telegramOpts,
}: GetFileUploaderOpts): FileUploader => {
  if (telegramOpts) {
    let t = telegram.find((x) => x.isEqual(telegramOpts));
    if (!t) {
      t = new TeleGramFileUploader(telegramOpts);
      telegram.push(t);
    }
    return t;
  }
  if (webhook) {
    return (
      currentWebHookUploader ||
      (currentWebHookUploader = new WebHookFileUploader({ url: webhook }))
    );
  }
  if (token && channel) {
    return (
      currentFileUploader ||
      (currentFileUploader = new ClientFileUploader({
        token,
        channel,
        bot,
      }))
    );
  }
  throw new Error("");
};
