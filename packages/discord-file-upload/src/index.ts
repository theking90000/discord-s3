import WebHookFileUploader from "./WebHookFileUploader";
import { ClientFileUploader } from "./ClientFileUploader";
import FileUploader from "./FileUploader";

interface GetFileUploaderOpts {
  token?: string;
  bot?: boolean;
  webhook?: string;
  channel?: string;
}

export const getFileUploader = ({
  bot,
  token,
  webhook,
  channel,
}: GetFileUploaderOpts): FileUploader => {
  if (webhook) {
    return new WebHookFileUploader({ url: webhook });
  }
  if (token && channel) {
    return new ClientFileUploader({
      token,
      channel,
      bot,
    });
  }
  throw new Error("");
};
