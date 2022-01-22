import { FastifyReply, FastifyRequest } from "fastify";
import { BucketObject } from "../models/BucketObject";
import { BucketPolicy } from "../models/BucketPolicy";
import S3Error from "./errors/S3Error";
import { parseHeader } from "./signature/signature";

async function auth(req: FastifyRequest<any>) {
  const mechanisms = {
    header: "Authorization" in req.headers,
    queryV2: "Signature" in req.query,
    queryV4: "X-Amz-Algorithm" in req.query,
  };

  const mechanismCount = Object.values(mechanisms).filter(Boolean).length;

  if (mechanismCount > 1) {
    throw new S3Error(
      "InvalidArgument",
      "Only one auth mechanism allowed; only the X-Amz-Algorithm query " +
        "parameter, Signature query string parameter or the Authorization " +
        "header should be specified",
      {
        ArgumentName: "Authorization",
        ArgumentValue: "Authorization",
      }
    );
  }

  const request = mechanisms.header ? parseHeader(req.headers) : {};

  return {
    async isBucketAllowed(bucket: BucketObject) {
      const policy = await BucketPolicy.findOne({ bucket: bucket._id });
      if (policy?.public) return true;
    },
  };
}

export default auth;
