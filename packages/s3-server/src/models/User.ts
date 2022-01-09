import {
  IMongooseDocument,
  ModelFromSchemaDef,
  pre,
  required,
  schemaDef,
} from "mongoose-decorators-ts";
import mongoose, { Connection, Document, Model } from "mongoose";
import { randomBytes, scrypt } from "crypto";
import { UnauthorizedError } from "http-errors-enhanced";
import jwt from "jsonwebtoken";

export interface UserAuthenticationOpts {
  name: string;
  password: string;
}

@schemaDef({
  schemaOpts: {
    id: true,
    versionKey: false,
    toJSON: {
      transform: (doc, ret) => {
        delete ret["password"];
        return ret;
      },
    },
  },
})
export class UserSchema {
  @required({})
  name!: string;

  @required({ unique: true })
  password!: string;

  @pre("save")
  async beforeSave() {
    return new Promise((resolve, reject) => {
      const salt = randomBytes(16).toString("base64");
      scrypt(this.password, salt, 64, (err, hash) => {
        if (err) reject(err);
        this.password = `${salt}@${hash.toString("base64")}`;
        resolve(null);
      });
    });
  }

  async verifyPassword(pwd: string) {
    return new Promise<boolean>((resolve, reject) => {
      const [salt, hash] = this.password.split("@");
      scrypt(pwd, salt, 64, (err, res) => {
        if (err) reject(err);
        resolve(hash === res.toString("base64"));
      });
    });
  }

  static async authenticateUser({ password, name }: UserAuthenticationOpts) {
    const user = await User.findOne({
      name,
    });

    if (user && (await user.verifyPassword(password))) {
      return {
        user,
        token: jwt.sign({ id: user._id }, process.env.JWT_KEY as string),
      };
    }

    throw new UnauthorizedError("Invalid Credentials");
  }
}

export const User = getModel();
export type User = IMongooseDocument<UserSchema>;

export function getModel(conn: Connection = mongoose.connection) {
  return ModelFromSchemaDef<typeof UserSchema, UserSchema>(UserSchema, conn);
}
