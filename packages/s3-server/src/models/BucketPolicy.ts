import {
  field,
  IMongooseDocument,
  ModelFromSchemaDef,
  required,
  schemaDef,
} from "mongoose-decorators-ts";
import mongoose, { Connection } from "mongoose";

@schemaDef({})
export class BucketPolicySchema {
  @required()
  bucket!: string;

  @field()
  public?: boolean;
}

export const BucketPolicy = getModel();
export type BucketPolicy = IMongooseDocument<BucketPolicySchema>;

export function getModel(conn: Connection = mongoose.connection) {
  return ModelFromSchemaDef<typeof BucketPolicySchema, BucketPolicySchema>(
    BucketPolicySchema,
    conn
  );
}
