import {
  field,
  IMongooseDocument,
  ModelFromSchemaDef,
  ref,
  required,
  schemaDef,
} from "mongoose-decorators-ts";
import mongoose, { Connection } from "mongoose";

@schemaDef({})
export class SourceProviderSchema {
  @ref("User")
  user!: string;

  @required()
  name!: string;

  @field()
  discordWebhook!: string;

  @field()
  discordBotToken!: string;

  @field()
  discordChannelId!: string;

  @field()
  telegramInfos!: { session: string; user: string };
}

export const SourceProvider = getModel();
export type SourceProvider = IMongooseDocument<SourceProviderSchema>;

export function getModel(conn: Connection = mongoose.connection) {
  return ModelFromSchemaDef<typeof SourceProviderSchema, SourceProviderSchema>(
    SourceProviderSchema,
    conn
  );
}
