import { FastifyInstance, HookHandlerDoneFunction } from "fastify";
import { Api } from "telegram";
import { CustomRequest } from "../..";
import { SourceProvider } from "../../models/SourceProvider";
import { getTelegramClient, getTelegramCredentials } from "../../telegram";
import { BadRequestError } from "http-errors-enhanced";

export default function (
  fastify: FastifyInstance,
  opts: {},
  done: HookHandlerDoneFunction
) {
  fastify.addSchema({
    $id: "info",
    type: "object",
    $submit: "add_provider",
    properties: {
      name: {
        type: "string",
        maxLength: 32,
      },
      discordWebhook: {
        type: "string",
        length: 120, // discord webhook size
      },
      discordBotToken: {
        type: "string",
        $password: true,
        length: 59,
      },
      discordChannelId: {
        type: "string",
        length: 18,
      },
      telegramInfos: {
        type: "object",
        properties: {
          phone: {
            type: "string",
            $preSet: "+$input",
            regexp:
              "^(-?(?:[1-9][0-9]*)?[0-9]{4})-(1[0-2]|0[1-9])-(3[01]|0[1-9]|[12][0-9])T(2[0-3]|[01][0-9]):([0-5][0-9]):([0-5][0-9])(.[0-9]+)?Z$",
          },
          phoneCodeHash: {
            type: "string",
            $hidden: true,
          },
          session: {
            type: "string",
            $hidden: true,
          },
          password: {
            type: "string",
            $hidden: true,
            $name: "sms_code",
          },
        },
        required: ["phone"],
      },
    },
    oneOf: [
      {
        required: ["name", "discordWebhook"],
        $name: "discordWebhook",
      },
      {
        required: ["name", "discordBotToken", "discordChannelId"],
        $name: "discordBot",
      },
      {
        required: ["name", "telegramInfos"],
        $name: "telegram",
      },
    ],
  });

  fastify
    .post(
      "/",
      {
        schema: {
          body: {
            $ref: "info#",
          },
        },
      },
      async (req: CustomRequest) => {
        try {
          const user = req!.user!.id;

          if (req.body.telegramInfos) {
            const tgClient = getTelegramClient(
              req.body.telegramInfos.session ?? ""
            );
            await tgClient.connect();

            if (!req.body.telegramInfos.password) {
              const { phoneCodeHash } = await tgClient.invoke(
                new Api.auth.SendCode({
                  ...getTelegramCredentials(),
                  phoneNumber: req.body.telegramInfos.phone,
                  settings: new Api.CodeSettings({
                    allowFlashcall: true,
                    currentNumber: true,
                    allowAppHash: true,
                  }),
                })
              );
              const session = tgClient.session.save();
              return {
                $schema: {
                  $mutate: {
                    properties: {
                      telegramInfos: {
                        properties: {
                          password: {
                            $hidden: false,
                          },
                        },
                      },
                    },
                  },
                  $setValue: {
                    telegramInfos: {
                      phone: req.body.telegramInfos.phone,
                      phoneCodeHash,
                      session,
                    },
                  },
                },
              };
            }
            if (
              req.body.telegramInfos.password &&
              req.body.telegramInfos.phoneCodeHash &&
              req.body.telegramInfos.session
            ) {
              const signIn = (await tgClient.invoke(
                new Api.auth.SignIn({
                  phoneCode: req.body.telegramInfos.password,
                  phoneNumber: req.body.telegramInfos.phone,
                  phoneCodeHash: req.body.telegramInfos.phoneCodeHash,
                })
              )) as any;
              if (signIn.user) {
                return new SourceProvider({
                  telegramInfos: {
                    session: req.body.telegramInfos.session,
                    user: signIn.user,
                  },
                  name: req.body.name,
                  user,
                }).save!();
              }
            }
            throw new BadRequestError();
          }
          return new SourceProvider({
            ...req.body,
            user,
          }).save!();
        } catch (e) {
          console.error(e);
          throw new BadRequestError();
        }
      }
    )
    .get("/schema", async (req) => {
      return fastify.getSchema("info");
    });

  fastify.get("/", async (req: CustomRequest) => {
    const user = req!.user!.id;

    return SourceProvider.find({ user });
  });

  done();
}
