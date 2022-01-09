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
export class ObjectPartSchema {
  @ref("BucketObject")
  object!: string;

  @required()
  downloadUrl!: string;

  @required()
  bytesRangeStart!: number;

  @required()
  bytesRangeEnd!: number;

  @field()
  encryptionKey?: string;

  @field()
  iv?: string;
}

export const ObjectPart = getModel();
export type ObjectPart = IMongooseDocument<ObjectPartSchema>;

export function getModel(conn: Connection = mongoose.connection) {
  return ModelFromSchemaDef<typeof ObjectPartSchema, ObjectPartSchema>(
    ObjectPartSchema,
    conn
  );
}
