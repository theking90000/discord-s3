import {
  IMongooseDocument,
  ModelFromSchemaDef,
  ref,
  required,
  schemaDef,
} from "mongoose-decorators-ts";
import mongoose, { Connection } from "mongoose";

@schemaDef({})
export class AccessKeySchema {
  @required()
  keyId!: string;

  @required()
  keySecret!: string;

  @ref("bucket")
  bucket!: string;
}

export const AccessKey = getModel();
export type AccessKey = IMongooseDocument<AccessKeySchema>;

export function getModel(conn: Connection = mongoose.connection) {
  return ModelFromSchemaDef<typeof AccessKeySchema, AccessKeySchema>(
    AccessKeySchema,
    conn
  );
}
