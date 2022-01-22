import "reflect-metadata";
import { FastifyReply, FastifyRequest } from "fastify";
import { FastifyInstance } from "fastify";
import { bootstrap } from "fastify-decorators";
import { resolve, dirname } from "path";

import S3Error from "./errors/S3Error";
import { fileURLToPath } from "url";

const S3methods = [
  "acl",
  "analytics",
  "cors",
  "delete",
  "encryption",
  "inventory",
  "lifecycle",
  "location",
  "metrics",
  "notification",
  "object-lock",
  "policy",
  "policyStatus",
  "publicAccessBlock",
  "replication",
  "requestPayment",
  "tagging",
  "uploads",
  "versions",
  "website",
];

export const S3server = async (
  fastify: FastifyInstance,
  opts: any,
  done: any
) => {
  fastify.addHook("preHandler", async (req) => {
    const methods = S3methods.filter((method) => method in (req as any).query);
    if (methods.length > 1)
      throw new S3Error(
        "InvalidArgument",
        `Conflicting query string parameters: ${methods.join(", ")}`,
        {
          ArgumentName: "ResourceType",
          ArgumentValue: methods[0],
        }
      );

    for (const key of Object.keys(req.query as {})) {
      if (key.toLowerCase().startsWith("x-amz-")) {
        req.headers[key] = (req as any).query[key];
      }
    }
  });
  fastify.get("/floppa", async () => {
    throw new S3Error(
      "InvalidArgument",
      `Conflicting query string parameters: acl`,
      {
        ArgumentName: "ResourceType",
        ArgumentValue: "acl",
      }
    );
  });
  function handleError(
    error: S3Error,
    req: FastifyRequest,
    reply: FastifyReply
  ) {
    if (!(error instanceof S3Error)) {
      error = S3Error.fromError(error);
    }
    reply
      .status(error.getStatus())
      .header("Content-Type", "application/xml")
      .send(error.toXML());
  }

  fastify.setErrorHandler(handleError);
  const __dirname = dirname(fileURLToPath(import.meta.url));

  fastify.register(bootstrap, {
    directory: resolve(__dirname, "handlers"),
    mask: /\.controller\.js$/,
  });

  done();
};
