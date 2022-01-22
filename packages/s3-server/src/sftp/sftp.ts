import { generateKeyPairSync } from "crypto";
import { existsSync, ReadStream, writeFileSync, WriteStream } from "fs";
import SFTPServer from "node-sftp-server";
import CustomDownloadStream from "packages/discord-file-upload/dist/CustomDownloadStream";
import { resolve } from "path/posix";
import { getUploader, uploadFilePart } from "../files/files";
import { AccessKey } from "../models/AccessKey";
import { Bucket } from "../models/Bucket";
import { BucketObject } from "../models/BucketObject";
import { ObjectPart } from "../models/ObjectPart";
import { SourceProvider } from "../models/SourceProvider";
import { Auth } from "./types";

const file = resolve("./.ssh_key");

export async function getKey() {
  console.log(file);
  if (!existsSync(file)) {
    const key = generateKeyPairSync("rsa", { modulusLength: 2048 });
    writeFileSync(
      file,
      key.privateKey.export({ type: "pkcs1", format: "pem" })
    );
  }
  return file;
}

export async function startSftp(port: number) {
  const sftp = new SFTPServer({ privateKeyFile: await getKey() });

  sftp.on("error", (err) => {
    console.error(err);
  });

  sftp.on("connect", async function (auth: Auth) {
    if (auth.method !== "password" || !auth.password) {
      return auth.reject(["password"], false);
    }
    const key = await AccessKey.findOne({
      keyId: auth.username,
    });
    if (!key) {
      return;
    }

    const bucketId = key.bucket;
    if (key.keySecret !== auth.password) {
      return auth.reject(["password"], false);
    }

    const bucket = await Bucket.findById(bucketId);

    const provider = await SourceProvider.findById(bucket?.provider);

    if (!provider) {
      return auth.reject(["password"], false);
    }

    auth.accept(async function (session) {
      session.on("readdir", async (path, responder) => {
        const objectPath = resolve("/", path).slice(1);

        const findRegex = new RegExp(
          `^${objectPath.replace(/\//g, "\\/")}${
            objectPath !== "" ? "\\/" : ""
          }.+`
        );

        console.dir(findRegex);

        let objects = await BucketObject.find({
          $and: [
            { bucket: bucketId },
            {
              path: {
                $regex: findRegex,
              },
            },
          ],
        });
        console.dir(objectPath);

        objects = objects.filter((object) =>
          objectPath !== ""
            ? object.path.split("/").length - 1 ===
                objectPath.split("/").length &&
              object.path.startsWith(objectPath)
            : object.path.split("/").length === 1
        );

        let i = 0;

        responder.on("dir", () => {
          if (i < objects.length) {
            const object = objects[i++];

            const name = object.path.split("/")[objectPath.split("/").length];

            responder.file(name || object.path, {
              size: object.size,
              atime: ~~(object.createdAt?.getTime() / 1000),
              mtime: ~~(object.updatedAt?.getTime() / 1000),
              mode: object.isInternalDir ? 16877 : 33188,
            });
          } else responder.end();
        });
      });

      session.on(
        "readfile",
        async function (this: any, path, stream: WriteStream) {
          const objectPath = resolve("/", path).slice(1);
          console.log(path);

          const object = await BucketObject.findOne({
            bucket: bucketId,
            path: objectPath,
            isInternalDir: false,
          });

          console.dir(object);

          if (!object) {
            stream.emit("finish");
            return stream.emit("end");
          }

          const chunks = await ObjectPart.find({
            object: object!._id,
          });

          if (object) {
            const download = getUploader(provider).download(chunks);

            download.on("data", function (data) {
              stream.write.call(stream, data, "utf-8");
            });

            download.on("end", function () {
              const id = (stream as any)?.fetchHandle?.call();

              stream.emit.call(stream, "finish");
              stream.emit.call(stream, "end");
            });
            console.log(chunks);

            if ((download as CustomDownloadStream).streamFrom) {
              (download as CustomDownloadStream).streamFrom(
                0,
                chunks[chunks.length - 1].bytesRangeEnd
              );
              (download as CustomDownloadStream).end();
            }
          }
        }
      );

      session.on("writefile", async function (path, stream: ReadStream) {
        const objectPath = resolve("/", path).slice(1);
        console.dir(objectPath);
        let object = await BucketObject.findOne({
          bucket: bucketId,
          path: objectPath,
        });

        if (object) {
          await ObjectPart.deleteMany({
            object: object._id,
          });
        } else {
          object = await new BucketObject({
            size: 0,
            bucket: bucketId,
            path: objectPath,
            isInternalDir: false,
          }).save!();
        }

        const chunks = await uploadFilePart({
          provider,
          _id: object._id,
          stream,
        });

        object.size = chunks[chunks.length - 1].bytesRangeEnd;
        await object.save!();
      });

      session.on("realpath", (path, callback) => {
        callback(resolve("/", path));
      });

      session.on("error", (error) => {
        console.error(error);
      });

      session.on("stat", async function (path, kind, responder) {
        const objectPath = resolve("/", path).slice(1);
        console.log(
          "Stats call on [path(%s), objectPath(%s), kind(%s)]",
          path,
          objectPath,
          kind
        );

        const object = await BucketObject.findOne({
          bucket: bucketId,
          path: objectPath,
        });

        if (object) {
          responder.atime = new Date((object as any).createdAt).getTime();
          responder.mtime = new Date((object as any).updatedAt).getTime();
          if (object.isInternalDir) {
            responder.is_directory();
          } else {
            responder.size = object.size;
            responder.is_file();
          }
          responder.permissions = 0o777;

          return responder.file();
        }

        responder.permissions = 0o777;
        objectPath === "" ? responder.is_directory() : responder.is_file();
        responder.file();
      });

      session.on("rmdir", async (path, responder) => {
        const objectPath = resolve("/", path).slice(1);
        const findRegex = new RegExp(
          `^${objectPath.replace(/\//g, "\\/")}${
            objectPath !== "" ? "\\/" : ""
          }.+`
        );
        await BucketObject.deleteMany({
          path: {
            $regex: findRegex,
          },
          bucket: bucketId,
        });
        responder.ok();
      });

      session.on("delete", async (path, responder) => {
        const objectPath = resolve("/", path).slice(1);
        await BucketObject.deleteMany({
          path: objectPath,
          bucket: bucketId,
        });
        responder.ok();
      });

      session.on("mkdir", async (path, responder) => {
        const objectPath = resolve("/", path).slice(1);

        const object = await BucketObject.findOne({
          bucket: bucketId,
          isInternalDir: false,
          path: objectPath,
        });

        if (object) {
          return responder.fail();
        }

        await new BucketObject({
          bucket: bucketId,
          size: 0,
          path: objectPath,
          isInternalDir: true,
        }).save!();

        responder.ok();
      });
    });
  });

  sftp.listen(port);
}
