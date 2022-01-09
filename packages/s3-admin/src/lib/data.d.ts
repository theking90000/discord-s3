interface DataBaseObject {
  _id: string;
}

export interface User extends DataBaseObject {
  name: string;
}

export interface Bucket extends DataBaseObject {
  name: string;
  owner?: string;
  size?: number;
}

export interface BucketWithInfos extends Bucket {
  objects: {
    totalSize: number;
    count: number;
  };
}

export interface BucketObject extends DataBaseObject {
  path: string;
  bucket: string;
  size: number;
}
export interface ObjectPart extends DataBaseObject {
  bytesRangeStart: number;
  bytesRangeEnd: number;
  downloadUrl: string;
  encryptionKey?: string;
  iv?: string;
}
