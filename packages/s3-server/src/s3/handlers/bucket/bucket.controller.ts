import { FastifyRequest } from "fastify";
import { ALL, Controller } from "fastify-decorators";
import S3Error, { MethodNotAllowed } from "../../errors/S3Error";

interface BucketRequestOpts {
  delimiter?: string;
  encodingType?: string;
  maxKeys: 1000;
  startAfter?: string;
  prefix?: string;
  fetchOwner?: string;
}

@Controller({ route: "/:bucket" })
export default class BucketController {
  @ALL()
  public async handle(
    req: FastifyRequest<{ Params: { queryMethod: string } }>
  ) {
    switch (req.params.queryMethod) {
      case undefined: {
        const options: BucketRequestOpts = {
          maxKeys: 1000,
        };
      }
      default: {
        throw new MethodNotAllowed(req.method, req.params.queryMethod);
      }
    }
  }

  public async getBucket(opts: BucketRequestOpts) {}
}
