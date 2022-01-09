import { FastifyInstance, HookHandlerDoneFunction } from "fastify";
import { CustomRequest } from "../../index";
import { Bucket } from "../../models/Bucket";
import { BucketObject } from "../../models/BucketObject";
import { BadRequestError } from "http-errors-enhanced";
import { uploadFilePart } from "../../files/files";
import { ReadStream } from "fs";
import { ObjectPart } from "../../models/ObjectPart";
import { downloadAllChunks } from "../../files/decrypt";

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

      const findRegex = new RegExp(`^${paths.join("\\/")}.+(?!.\/)`);

      console.log(findRegex);

      return BucketObject.find({
        $and: [
          { bucket: bucket._id },
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

  fastify.post(
    "/",
    {
      schema: {
        body: {
          name: {
            type: "string",
          },
          size: {
            type: "number",
            optional: true,
          },
        },
      },
    },
    async (req: CustomRequest) => {
      const user = req?.user!.id;
      const { name, size } = req.body as { name: string; size: number };
      if (await Bucket.findOne({ name }))
        throw new BadRequestError("Bucket already exist");
      return new Bucket({ name, size, owner: user }).save!();
    }
  );

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
    };
    console.dir(info);
    if (info.size < 1) throw new BadRequestError("ok");

    const object = new BucketObject({
      bucket: bucket._id,
      path: info.path,
      size: info.size,
    });
    await object.save!();

    return await uploadFilePart({
      _id: object._id,
      stream: data.file as ReadStream,
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

  fastify.get("/:id/:fileId/download", async (req: CustomRequest, res) => {
    const user = req?.user!.id;

    const { id, fileId } = req.params as { id: string; fileId: string };

    const bucket = await Bucket.findOne({
      $and: [{ _id: id }, { user: user }],
    });

    if (!bucket) {
      throw new BadRequestError();
    }

    res.send(downloadAllChunks(fileId));
  });

  done();
}
