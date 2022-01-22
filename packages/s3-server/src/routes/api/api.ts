import {
  FastifyInstance,
  FastifyReply,
  HookHandlerDoneFunction,
} from "fastify";
import user from "./user";
import { CustomRequest } from "../../index";
import jwt from "jsonwebtoken";
import { User } from "../../models/User";
import { UnauthorizedError } from "http-errors-enhanced";
import fastifyHttpErrorsEnhanced from "fastify-http-errors-enhanced";
import buckets from "./buckets";
import providers from "./providers";

export default async function (
  fastify: FastifyInstance,
  opts: {},
  done: HookHandlerDoneFunction
) {
  fastify.register(fastifyHttpErrorsEnhanced);

  fastify.addHook(
    "onRequest",
    (req: CustomRequest, res: FastifyReply, next: HookHandlerDoneFunction) => {
      if (req.headers.authorization) {
        try {
          const data = jwt.verify(
            req.headers.authorization as string,
            process.env.JWT_KEY as string
          ) as { id: string };
          let user: User | undefined;
          req.user = {
            get: async () => {
              return user || (user = (await User.findById(data.id)) as User);
            },
            id: data.id,
          };
          return next();
        } catch (e) {
          throw e;
        }
      }
      if (req.routerPath === "/api/buckets/:id/:fileId/stream") {
        return next();
      }

      throw new UnauthorizedError("Valid authorization is required");
    }
  );

  fastify.register(user, {
    prefix: "/users",
  });
  fastify.register(buckets, {
    prefix: "/buckets",
  });
  fastify.register(providers, {
    prefix: "/providers",
  });

  done();
}
