import S3Error from "../errors/S3Error";
import * as v2 from "./v2";

export const parseDate = (dateString: string): number => {
  let date: any = new Date(dateString);
  if (isNaN(date as any)) {
    date = new Date(date).toISOString().replace(/[-:]|\.\d+/g, "");
  }
  return date;
};

export interface Request {
  signature?: {
    version: number;
    algorithm: string;
    encoding: string;
  };
  accessKeyId?: string;
  time: string;
}

export function parseHeader(headers: any) {
  const request: Request = {
    signature: undefined,
    accessKeyId: undefined,
    time: headers["x-amz-date"] || headers.date,
  };

  const [algorithm] = headers.authorization.split(" ");
  switch (algorithm.toUpperCase()) {
    case "AWS":
      request.signature = {
        version: 2,
        algorithm: "sha1",
        encoding: "base64",
      };
      break;
    case "AWS4-HMAC-SHA256":
      request.signature = {
        version: 4,
        algorithm: "sha256",
        encoding: "hex",
      };
      break;
    default:
      throw new S3Error("InvalidArgument", "Unsupported Authorization Type", {
        ArgumentName: "Authorization",
        ArgumentValue: headers.authorization,
      });
  }

  switch (request.signature.version) {
    case 2:
      Object.assign(request, v2.parseHeader(headers));
      break;
    case 4:
      //Object.assign(request, v4.parseHeader(headers));
      throw new S3Error("AccessDenied", "Signature v4 not implemented");
      break;
  }

  const serverTime: any = new Date();
  const requestTime = parseDate(request.time);
  if (isNaN(requestTime)) {
    throw new S3Error(
      "AccessDenied",
      "AWS authentication requires a valid Date or x-amz-date header"
    );
  }

  if (Math.abs(serverTime - requestTime) > 900000) {
    // 15 minutes
    throw new S3Error(
      "RequestTimeTooSkewed",
      "The difference between the request time and the current time is too large.",
      {
        RequestTime: request.time,
        ServerTime: serverTime.toISOString().replace(/\.\d+/, ""),
      }
    );
  }
  return request;
}
