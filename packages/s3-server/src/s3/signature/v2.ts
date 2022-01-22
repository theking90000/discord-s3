import S3Error from "../errors/S3Error";

export function parseHeader(headers: any) {
  const [, ...components] = headers.authorization?.split(" ");
  if (components.length !== 1) {
    throw new S3Error(
      "InvalidArgument",
      "Authorization header is invalid -- one and only one ' ' (space) required",
      {
        ArgumentName: "Authorization",
        ArgumentValue: headers.authorization,
      }
    );
  }
  const match = /([^:]*):([^:]+)/.exec(components[0]);
  if (!match) {
    throw new S3Error(
      "InvalidArgument",
      "AWS authorization header is invalid.  Expected AwsAccessKeyId:signature",
      {
        ArgumentName: "Authorization",
        ArgumentValue: headers.authorization,
      }
    );
  }

  return { accessKeyId: match[1], signatureProvided: match[2] };
}

export function parseQuery(query: any) {
  // authentication param names are case-sensitive
  if (!("Expires" in query) || !("AWSAccessKeyId" in query)) {
    throw new S3Error(
      "AccessDenied",
      "Query-string authentication requires the Signature, Expires and " +
        "AWSAccessKeyId parameters"
    );
  }

  const request = {
    signature: {
      version: 2,
      algorithm: "sha1",
      encoding: "base64",
    },
    accessKeyId: query.AWSAccessKeyId,
    expires: Number(query.Expires),
    signatureProvided: query.Signature,
  };

  const serverTime = new Date() as any;
  const expiresTime = new Date(request.expires * 1000) as any;
  if (isNaN(expiresTime)) {
    throw new S3Error(
      "AccessDenied",
      `Invalid date (should be seconds since epoch): ${query.Expires}`
    );
  }

  if (serverTime > expiresTime) {
    throw new S3Error("AccessDenied", "Request has expired", {
      Expires: expiresTime.toISOString().replace(/\.\d+/, ""),
      ServerTime: serverTime.toISOString().replace(/\.\d+/, ""),
    });
  }

  return request;
}
