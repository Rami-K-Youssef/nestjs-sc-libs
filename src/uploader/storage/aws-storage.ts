import { Readable, Writable } from "stream";
import {
  SingleFieldUploadOptions,
  UploadModuleStorageType,
  UploadedFile,
  UploadModuleOptions,
} from "../interfaces";
import {
  BaseStorageManager,
  DownloadableFile,
  GeneratedFileAttributes,
} from "./storage-manager.base";
import { StorageFunction } from "./types";

import * as AWS from "aws-sdk";
import * as path from "path";
import archiver from "archiver";
import {
  instantiateBadFileException,
  instantiateFileNotFoundException,
} from "../exceptions";

export class AwsStorageManager extends BaseStorageManager {
  private getUrlFromBucket(bucket, path) {
    const regionString = this.options.awsStorageOptions.region.includes(
      "us-east-1"
    )
      ? ""
      : "-" + this.options.awsStorageOptions.region;
    return `https://${bucket}.s3${regionString}.amazonaws.com/${path}`;
  }

  private s3: AWS.S3;
  private getBucket(isPrivate) {
    return isPrivate
      ? this.options.awsStorageOptions.privateBucketName ??
          this.options.awsStorageOptions.publicBucketName
      : this.options.awsStorageOptions.publicBucketName;
  }

  constructor(protected readonly options: UploadModuleOptions) {
    super(options);
    const credentials = new AWS.Credentials({
      secretAccessKey: options.awsStorageOptions.secretAccessKey,
      accessKeyId: options.awsStorageOptions.accessKeyId,
    });
    AWS.config.update({
      region: options.awsStorageOptions.region,
      credentials,
    });
    this.s3 = new AWS.S3();
  }
  protected storageFunction: StorageFunction;

  public getStorageFunc(): StorageFunction {
    if (!this.storageFunction)
      this.storageFunction = storeFileOnCloud.bind(this);
    return this.storageFunction;
  }
  public getFileMetadata(
    file: Partial<Express.Multer.File>,
    name: string,
    options: SingleFieldUploadOptions,
    user?: any,
    info?: Record<string, string>
  ): GeneratedFileAttributes {
    const bucket = this.getBucket(options.isPrivate);

    const optDestination = options.destination
      ? typeof options.destination == "string"
        ? options.destination
        : options.destination(user)
      : "";
    const finalDestination = optDestination;
    const filepath = path.join(finalDestination, name);

    const optionals = {} as any;
    if (file.fieldname) optionals.filedName = file.fieldname;
    if (file.originalname) optionals.originalName = file.originalname;
    if (file.mimetype) optionals.mimeType = file.mimetype;

    const url = this.getUrlFromBucket(bucket, filepath);

    return {
      fileName: name,
      isPrivate: options.isPrivate,
      url,
      path: filepath,
      ...optionals,
      finalDestination,
      info,
    };
  }
  public getStorageType(): UploadModuleStorageType {
    return UploadModuleStorageType.AWS;
  }
  public store(
    meta: GeneratedFileAttributes,
    stream: Readable
  ): Promise<UploadedFile> {
    const bucket = this.getBucket(meta.isPrivate);
    let size = 0;
    const ogRead = stream.read.bind(stream);
    stream.read = function (size?: number) {
      const resultingBuffer = ogRead(size);
      if (resultingBuffer?.length) size += resultingBuffer;
      return resultingBuffer;
    };
    return new Promise<UploadedFile>((resolve, reject) => {
      stream.on("error", () => reject(instantiateBadFileException()));
      this.s3.upload(
        {
          Bucket: bucket,
          Key: meta.path,
          Body: stream,
        },
        {},
        (err, data) => {
          if (err) return reject(err);
          resolve(
            new UploadedFile({
              ...meta,
              size,
              url: data.Location,
              delete: () => {
                return new Promise<void>((resolve, reject) => {
                  this.s3.deleteObject(
                    {
                      Key: meta.path,
                      Bucket: bucket,
                    },
                    (err, data) => {
                      if (err) return reject(err);
                      return resolve();
                    }
                  );
                });
              },
            })
          );
        }
      );
    });
  }
  public getFileBuffer(file: DownloadableFile): Promise<Buffer> {
    const bucket = this.getBucket(file.isPrivate);
    return new Promise<Buffer>((resolve, reject) => {
      this.s3.getObject({ Key: file.path, Bucket: bucket }, (err, data) => {
        if (err) return reject(err);
        return resolve(data.Body as Buffer);
      });
    });
  }
  public deleteFile(file: DownloadableFile): Promise<void> {
    const bucket = this.getBucket(file.isPrivate);
    return new Promise((resolve, reject) => {
      this.s3.deleteObject({ Bucket: bucket, Key: file.path }, (err, data) => {
        if (err) return reject(err);
        return resolve();
      });
    });
  }

  private async _getFileStream(file: DownloadableFile) {
    const bucket = this.getBucket(file.isPrivate);
    const stream = await new Promise<Readable>((resolve, reject) => {
      const stream = this.s3
        .getObject({ Bucket: bucket, Key: file.path })
        .createReadStream();
      stream.once("error", (err: AWS.AWSError) => {
        if (err.code == "NoSuchKey" || err.code == "NotFound")
          return reject(instantiateFileNotFoundException());
        return reject(err);
      });
      stream.once("readable", () => resolve(stream));
    });
    return stream;
  }

  public async pipeFile(
    file: DownloadableFile,
    writable: Writable
  ): Promise<void> {
    const stream = await this._getFileStream(file);
    stream.pipe(writable);
  }
  public zipMultipleFiles(
    files: DownloadableFile[],
    writable: Writable
  ): Promise<void> {
    const archive = archiver("zip");
    return new Promise<void>(async (resolve, reject) => {
      archive.on("error", reject);

      await Promise.all(
        files.map(async (file) => {
          archive.append(await this._getFileStream(file), {
            name: file.overrideName ?? file.originalName,
          });
        })
      );

      archive.pipe(writable);
      archive.finalize();
      archive.on("close", resolve);
    });
  }
}

async function storeFileOnCloud(
  this: AwsStorageManager,
  file: Partial<Express.Multer.File>,
  name: string,
  stream: Readable,
  options: SingleFieldUploadOptions,
  user?: any,
  info?: Record<string, string>
) {
  const meta = this.getFileMetadata(file, name, options, user, info);
  delete meta.finalDestination;
  return await this.store(meta, stream);
}
