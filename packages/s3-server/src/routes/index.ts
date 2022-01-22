import api from "./api/api";
import {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  HookHandlerDoneFunction,
} from "fastify";
import { User } from "../models/User";
import jwt from "jsonwebtoken";

// @ts-ignore
export default async function (
  fastify: FastifyInstance,
  opts: {},
  done: HookHandlerDoneFunction
) {
  fastify.get("/test", async () => {
    process.exit();
  });

  fastify.post(
    "/auth",
    {
      schema: {
        body: {
          password: { type: "string" },
          name: { type: "string" },
        },
      },
    },
    async (req: FastifyRequest, res: FastifyReply) => {
      return User.authenticateUser(
        req.body as { password: string; name: string }
      );
    }
  );

  fastify.register(api, {
    prefix: "/api",
  });

  done();
}
