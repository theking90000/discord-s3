import { FastifyInstance, HookHandlerDoneFunction } from "fastify";
import { CustomRequest } from "../../index";
import { Bucket } from "../../models/Bucket";
import { BucketObject } from "../../models/BucketObject";
import { BadRequestError } from "http-errors-enhanced";
import { getUploader, uploadFilePart } from "../../files/files";
import { ReadStream } from "fs";
import { ObjectPart } from "../../models/ObjectPart";
import { SourceProvider } from "../../models/SourceProvider";
import CustomDownloadStream from "@discord-s3/discord-file-upload/dist/CustomDownloadStream";
import { AccessKey } from "../../models/AccessKey";
import { randomBytes } from "crypto";
import jwt from "jsonwebtoken";
import { UnauthorizedError } from "telegram/errors";
import { off } from "process";
import { Readable } from "stream";

export default function (
  fastify: FastifyInstance,
  opts: {},
  done: HookHandlerDoneFunction
) {
  fastify.get("/", async (req: CustomRequest) => {
    const user = req?.user!.id;

    const buckets = await Bucket.find().where("user", user);

    return buckets;
  });

  fastify
    .addSchema({
      $id: "bucket",
      type: "object",
      $submit: "add_bucket",
      properties: {
        name: {
          type: "string",
        },
        provider: {
          type: "string",
          $key: "_id",
          $keyFormat: "$name",
          $itemType: "/providers",
        },
      },
      required: ["name", "provider"],
    })
    .post(
      "/",
      {
        schema: {
          body: {
            $ref: "bucket#",
          },
        },
      },
      async (req: CustomRequest) => {
        const owner = req!.user!.id;

        if (await Bucket.findOne({ name: req.body.name }))
          throw new BadRequestError("Bucket already exist");

        return new Bucket({ ...req.body, owner }).save!();
      }
    )
    .get("/schema", async () => {
      return fastify.getSchema("bucket");
    });

  fastify.get("/:id/find/*", async (req: CustomRequest) => {
    try {
      const user = req?.user!.id;
      const { id } = req.params as { id: string };
      const paths = (req.params as { "*": string })["*"].split("/");

      const bucket = await Bucket.findOne({
        $and: [{ _id: id }, { user: user }],
      });

      if (!bucket) {
        throw new BadRequestError();
      }

      const findRegex = new RegExp(
        `^${paths.join("\\/")}${paths[0] !== "" ? "\\/" : ""}.+`
      );
      console.dir(findRegex);
      return BucketObject.find({
        $and: [
          { bucket: bucket._id },
          { isInternalDir: false },
          {
            path: {
              $regex: findRegex,
            },
          },
        ],
      });
    } catch (e) {
      console.error(e);
      throw e;
    }
  });

  fastify.get("/:id", async (req: CustomRequest) => {
    try {
      const user = req?.user!.id;
      const { id } = req.params as { id: string };

      const bucket = await Bucket.findOne({
        $and: [{ _id: id }, { user: user }],
      });

      if (!bucket) {
        throw new BadRequestError();
      }
      return {
        ...bucket.toJSON!(),
        objects: await bucket.getObjectsInfo(),
      };
    } catch (e) {
      console.error(e);
      throw e;
    }
  });

  fastify.delete("/:id", async (req: CustomRequest) => {
    const user = req?.user!.id;
    const { id } = req.params as { id: string };
    const bucket = await Bucket.findOne({
      $and: [{ _id: id }, { user: user }],
    });
    await bucket?.remove!();
  });

  fastify.get("/:id/:fileId", async (req: CustomRequest) => {
    const user = req?.user!.id;
    const { id, fileId } = req.params as { id: string; fileId: string };

    const bucket = await Bucket.findOne({
      $and: [{ _id: id }, { user: user }],
    });

    if (!bucket) {
      throw new BadRequestError();
    }

    return BucketObject.findOne({
      $and: [
        {
          bucket: bucket._id,
        },
        {
          isInternalDir: false,
        },
        {
          _id: fileId,
        },
      ],
    });
  });

  fastify.put("/:id", async (req: CustomRequest) => {
    const user = req?.user!.id;

    const { id } = req.params as { id: string };

    const bucket = await Bucket.findOne({
      $and: [{ _id: id }, { user: user }],
    });

    if (!bucket) {
      throw new BadRequestError();
    }
    const data = await req.file();

    const info = JSON.parse((data as any).fields?.data?.value) as unknown as {
      path: string;
      size: number;
      contentType?: string;
    };

    if (info.size < 1) throw new BadRequestError("field data is missing");

    const provider = await SourceProvider.findById(bucket.provider);
    if (!provider) {
      throw new BadRequestError();
    }

    const object = new BucketObject({
      bucket: bucket._id,
      path: info.path,
      size: info.size,
      isInternalDir: false,
      contentType: info.contentType || "application/octet-stream",
    });

    await object.save!();

    return await uploadFilePart({
      _id: object._id,
      stream: data.file as ReadStream,
      provider,
    });
  });

  fastify.get("/:id/:fileId/parts", async (req: CustomRequest) => {
    const user = req?.user!.id;

    const { id, fileId } = req.params as { id: string; fileId: string };

    const bucket = await Bucket.findOne({
      $and: [{ _id: id }, { user: user }],
    });

    if (!bucket) {
      throw new BadRequestError();
    }

    const file = await BucketObject.findOne({
      $and: [
        {
          bucket: bucket._id,
        },
        {
          isInternalDir: false,
        },
        {
          _id: fileId,
        },
      ],
    });

    if (!file) {
      throw new BadRequestError();
    }

    const objects = await ObjectPart.find({
      object: file._id,
    });

    return objects
      .sort((a, b) => a.bytesRangeStart - b.bytesRangeStart)
      .map((object: any) => {
        delete object.object;
        return object;
      });
  });

  fastify.get("/:id/keys", async (req: CustomRequest) => {
    const user = req?.user!.id;

    const { id } = req.params as { id: string };

    const bucket = await Bucket.findOne({
      $and: [{ _id: id }, { user: user }],
    });

    if (!bucket) throw new BadRequestError();

    return AccessKey.find({
      buckets: bucket?._id,
    });
  });

  fastify.post("/:id/keys", async (req: CustomRequest) => {
    const user = req?.user!.id;

    const { id } = req.params as { id: string };

    const bucket = await Bucket.findOne({
      $and: [{ _id: id }, { user: user }],
    });

    if (!bucket) throw new BadRequestError();

    return new AccessKey({
      bucket: bucket._id,
      keyId: randomBytes(16).toString("hex").toUpperCase(),
      keySecret: randomBytes(64).toString("base64"),
    }).save!();
  });

  const getChunks = async (req: CustomRequest) => {
    const { token } = req.query as { token: string };
    const { id, fileId } = req.params as { id: string; fileId: string };
    let user = undefined;
    if (token) {
      const data = jwt.verify(token, process.env.JWT_KEY as string) as {
        bucketId: string;
        fileId: string;
      };
      console.log(data);
      console.log("bucketId " + id);
      console.log("fileId " + fileId);
      if (data.bucketId !== id || fileId !== data.fileId)
        throw new BadRequestError("Wrong Token");
    } else {
      user = req?.user!.id;
    }

    const bucket = await Bucket.findOne({
      _id: id,
      user,
    });

    if (!bucket) {
      throw new BadRequestError();
    }

    const provider = await SourceProvider.findById(bucket.provider);

    if (!provider) {
      throw new BadRequestError();
    }

    const object = await BucketObject.findOne({
      object: fileId,
      bucket: bucket._id,
      isInternalDir: false,
    });
    if (!object) {
      throw new BadRequestError();
    }

    const chunks = await ObjectPart.find({
      object: fileId,
    });

    if (chunks.length === 0) throw new BadRequestError("No chunks");

    return { chunks, provider, object };
  };

  fastify.get("/:id/:fileId/stream", async (req: CustomRequest, res) => {
    const { chunks, provider, object } = await getChunks(req);

    const download = getUploader(provider).download(chunks);

    let maxSize = chunks[chunks.length - 1].bytesRangeEnd;

    let start = NaN,
      end = NaN;

    if (req.headers.range) {
      let ranges = req.headers.range.replace(/bytes=/, "").split("-");
      console.log(ranges);
      start = parseInt(ranges[0], 10);
      end = ranges[1] ? parseInt(ranges[1], 10) : NaN;
    } else {
      res
        .status(200)
        .header("Accept-Ranges", "bytes")
        .header("Content-Type", object.contentType || "video/mp4")
        .header("Content-Length", maxSize);
      res.send(download);
      download.streamFrom(0, maxSize);
      return;
    }

    if (isNaN(start)) {
      start = 0;
    }

    if (isNaN(end) || end < start) {
      end = Math.min(maxSize, start + 512 * 1024);
    }
    console.log(end);
    if (start >= maxSize || end > maxSize) {
      return res
        .status(416)
        .header("Content-Range", `bytes */${maxSize}`)
        .send();
    }
    res.raw.writeHead(206, {
      "Content-Range": `bytes ${start}-${end - 1}/${maxSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": end - start,
      "Content-Type": object.contentType || "video/mp4",
      "Transfer-Encoding": "chunked",
    });

    download.pipe(res.raw);
    download.on("close", () => {
      console.log(res.raw.writableLength);
    });
    download.streamFrom(start, end);
    download.end();

    return;
  });

  fastify.get("/:id/:fileId/download", async (req: CustomRequest, res) => {
    const { chunks, provider, object } = await getChunks(req);
    const { id, fileId } = req.params as { id: string; fileId: string };
    const { stream } = req.query as { stream?: boolean };

    if (stream) {
      const token = jwt.sign(
        {
          bucketId: id,
          fileId: fileId,
        },
        process.env.JWT_KEY as string
      );
      return { token };
    }

    const download = getUploader(provider).download(chunks);

    if ((download as CustomDownloadStream).streamFrom) {
      try {
        res.send(download);
        (download as CustomDownloadStream).streamFrom(
          0,
          chunks[chunks.length - 1].bytesRangeEnd
        );
        (download as CustomDownloadStream).end();
        return;
      } catch (e) {
        console.error(e);
      }
    } else res.send(download);
  });

  done();
}
