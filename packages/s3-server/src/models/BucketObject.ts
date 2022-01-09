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
export class BucketObjectSchema {
  @required()
  path!: string;

  @ref("Bucket")
  bucket!: string;

  @field()
  size!: number;
}

export const BucketObject = getModel();
export type BucketObject = IMongooseDocument<BucketObjectSchema>;

export function getModel(conn: Connection = mongoose.connection) {
  return ModelFromSchemaDef<typeof BucketObjectSchema, BucketObjectSchema>(
    BucketObjectSchema,
    conn
  );
}
