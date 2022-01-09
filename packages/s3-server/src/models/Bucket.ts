import {
  field,
  IMongooseDocument,
  ModelFromSchemaDef,
  ref,
  required,
  schemaDef,
} from "mongoose-decorators-ts";
import mongoose, { Connection } from "mongoose";
import { BucketObject } from "./BucketObject";

@schemaDef({})
export class BucketSchema {
  @required()
  name!: string;

  @ref("User")
  owner?: string;

  @field()
  size?: number;

  async getObjectsInfo(): Promise<{ totalSize: number; count: number }> {
    const results = await BucketObject.aggregate([
      {
        $match: {
          bucket: (this as any)._id,
        },
      },
      {
        $group: {
          _id: null,
          totalSize: { $sum: "$size" },
          count: { $sum: 1 },
        },
      },
    ]);
    if (!results[0]) return { totalSize: 0, count: 0 };
    delete results[0]._id;
    return results[0];
  }
}

export const Bucket = getModel();
export type Bucket = IMongooseDocument<BucketSchema>;

export function getModel(conn: Connection = mongoose.connection) {
  return ModelFromSchemaDef<typeof BucketSchema, BucketSchema>(
    BucketSchema,
    conn
  );
}
