import { XMLBuilder } from "fast-xml-parser";

export default class S3Error extends Error {
  static fromError(err: any) {
    return new S3Error(
      "InternalError",
      err?.expose
        ? err.message
        : "We encountered an internal error. Please try again."
    );
  }
  private code: string;
  private detail: any;
  private errors: any[] = [];
  private headers: { [key: string]: string };
  private status: number;

  constructor(code: string, message: string, detail: any = {}) {
    super(message);
    this.code = code;
    this.detail = detail;

    function keys() {
      let a: any = {};
      Object.keys(detail).forEach((key) => {
        a[key] = detail[key];
      });
      return a;
    }

    this.headers = {
      "x-amz-error-code": code,
      "x-amz-error-message": message,
      ...keys(),
    };
    this.status = s3Statuses[code as keyof typeof s3Statuses] || 500;
  }

  public getStatus() {
    return this.status;
  }

  public toXML() {
    const builder = new XMLBuilder({});
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      builder.build({
        Error: {
          Code: this.code,
          Message: this.message,
          ...this.detail,
        },
      }),
    ].join("\n");
  }
}

export class MethodNotAllowed extends S3Error {
  constructor(method: string, queryMethod: string) {
    super(
      "MethodNotAllowed",
      "The specified method is not allowed against this resource.",
      {
        Method: method.toUpperCase(),
        ResourceType: queryMethod.toUpperCase(),
      }
    );
  }
}

// from https://github.com/jamhall/s3rver/blob/main/lib/models/error.js
const s3Statuses = {
  AccessDenied: 403,
  AccountProblem: 403,
  AllAccessDisabled: 403,
  AmbiguousGrantByEmailAddress: 400,
  AuthorizationHeaderMalformed: 400,
  BadDigest: 400,
  BucketAlreadyExists: 409,
  BucketAlreadyOwnedByYou: 409,
  BucketNotEmpty: 409,
  CredentialsNotSupported: 400,
  CrossLocationLoggingProhibited: 403,
  EntityTooSmall: 400,
  EntityTooLarge: 400,
  ExpiredToken: 400,
  IllegalVersioningConfigurationException: 400,
  IncompleteBody: 400,
  IncorrectNumberOfFilesInPostRequest: 400,
  InlineDataTooLarge: 400,
  InternalError: 500,
  InvalidAccessKeyId: 403,
  InvalidArgument: 400,
  InvalidBucketName: 400,
  InvalidBucketState: 409,
  InvalidDigest: 400,
  InvalidEncryptionAlgorithmError: 400,
  InvalidLocationConstraint: 400,
  InvalidObjectState: 403,
  InvalidPart: 400,
  InvalidPartOrder: 400,
  InvalidPayer: 403,
  InvalidPolicyDocument: 400,
  InvalidRange: 416,
  InvalidRequest: 400,
  InvalidSecurity: 403,
  InvalidSOAPRequest: 400,
  InvalidStorageClass: 400,
  InvalidTargetBucketForLogging: 400,
  InvalidToken: 400,
  InvalidURI: 400,
  KeyTooLongError: 400,
  MalformedACLError: 400,
  MalformedPOSTRequest: 400,
  MalformedXML: 400,
  MaxMessageLengthExceeded: 400,
  MaxPostPreDataLengthExceededError: 400,
  MetadataTooLarge: 400,
  MethodNotAllowed: 405,
  MissingContentLength: 411,
  MissingRequestBodyError: 400,
  MissingSecurityElement: 400,
  MissingSecurityHeader: 400,
  NoLoggingStatusForKey: 400,
  NoSuchBucket: 404,
  NoSuchBucketPolicy: 404,
  NoSuchKey: 404,
  NoSuchLifecycleConfiguration: 404,
  NoSuchUpload: 404,
  NoSuchVersion: 404,
  NotImplemented: 501,
  NotSignedUp: 403,
  OperationAborted: 409,
  PermanentRedirect: 301,
  PreconditionFailed: 412,
  Redirect: 307,
  RestoreAlreadyInProgress: 409,
  RequestIsNotMultiPartContent: 400,
  RequestTimeout: 400,
  RequestTimeTooSkewed: 403,
  RequestTorrentOfBucketError: 400,
  SignatureDoesNotMatch: 403,
  ServiceUnavailable: 503,
  SlowDown: 503,
  TemporaryRedirect: 307,
  TokenRefreshRequired: 400,
  TooManyBuckets: 400,
  UnexpectedContent: 400,
  UnresolvableGrantByEmailAddress: 400,
  UserKeyMustBeSpecified: 400,

  // Additional errors not documented by the above
  AuthorizationQueryParametersError: 400,
  BadRequest: 403,
  CORSResponse: 403,
  InvalidChunkSizeError: 403,
  InvalidRedirectLocation: 400,
  NoSuchCORSConfiguration: 404,
  NoSuchWebsiteConfiguration: 404,
  UnsupportedQuery: 404,
};
