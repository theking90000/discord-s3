import Fastify, { FastifyInstance, FastifyRequest } from "fastify";
import mongoose from "mongoose";
import { User } from "./models/User";
import routes from "./routes";
import fastifyCors from "fastify-cors";
import { RouteGenericInterface } from "fastify/types/route";
import multipart from "fastify-multipart";
import { BucketObject } from "./models/BucketObject";
import fastifyHttpProxy from "fastify-http-proxy";
export interface CustomRequest<K = any> extends FastifyRequest {
  user?: {
    get: () => Promise<User>;
    id: string;
  };
  body: K;
}

export let server!: FastifyInstance;

export interface StartServerOpts {
  logger?: (str: string) => void;
  port?: number;
}

export default async function startServer({
  logger,
  port = 9000,
}: StartServerOpts) {
  server = Fastify({
    logger: logger
      ? {
          stream: {
            write(data) {
              logger(data);
            },
          },
          prettyPrint: true,
        }
      : false,
  });

  const mongo = await mongoose.connect(process.env.MONGO_URL as string);

  server.decorate("mongoose", mongo);

  server.register(fastifyCors);
  server.register(multipart);
  server.register(routes);
  server.register(fastifyHttpProxy, {
    upstream: "https://cdn.discordapp.com",
    prefix: "/discord_cdn",
    rewritePrefix: "",
  });
  server.listen(port);
}
