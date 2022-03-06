import { SingleFieldUploadOptions, UploadModuleOptions } from "..";
import { UploadedFile } from "../interfaces";

import * as path from "path";
import * as fs from "fs";
import { Readable } from "stream";
import {
  BaseStorageManager,
  GeneratedFileAttributes,
} from "./storage-manager.base";
import { StorageFunction } from "./types";

export class LocalStorageManager extends BaseStorageManager {
  constructor(protected readonly options: UploadModuleOptions) {
    super(options);
  }

  protected storageFunction: StorageFunction;

  override getStorageFunc(): StorageFunction {
    if (!this.storageFunction)
      this.storageFunction = generateLocalStorageFunc(
        this.options.localStorageOptions.storageDir ?? "uploads",
        this.options.localStorageOptions.publicServePath
      ).bind(this);
    return this.storageFunction;
  }

  override getFileMetadata(
    file: Partial<Express.Multer.File>,
    name: string,
    options: SingleFieldUploadOptions,
    user?: any
  ): GeneratedFileAttributes {
    const storageDir = this.options.localStorageOptions.storageDir ?? "uploads";
    const publicServePath = this.options.localStorageOptions.publicServePath;

    const optDestination = options.destination
      ? typeof options.destination == "string"
        ? options.destination
        : options.destination(user)
      : "";

    const finalDestination = path.join(
      storageDir,
      options.isPrivate ? "private" : "public",
      optDestination
    );
    const filepath = path.join(finalDestination, name);
    const optionals = {} as any;
    if (file.fieldname) optionals.filedName = file.fieldname;
    if (file.originalname) optionals.originalName = file.originalname;
    if (file.mimetype) optionals.mimeType = file.mimetype;

    return {
      fileName: name,
      isPrivate: options.isPrivate,
      url: options.isPrivate
        ? null
        : path.join(publicServePath, optDestination, name),
      path: filepath,
      ...optionals,
      finalDestination,
    };
  }
}

function generateLocalStorageFunc(storageDir: string, publicServePath: string) {
  return async function storeFileLocally(
    this: LocalStorageManager,
    file: Partial<Express.Multer.File>,
    name: string,
    stream: Readable,
    options: SingleFieldUploadOptions,
    user?: any
  ): Promise<UploadedFile> {
    return new Promise<UploadedFile>((resolve, reject) => {
      const meta = this.getFileMetadata(file, name, options, user);

      fs.mkdirSync(meta.finalDestination, { recursive: true });

      const outStream = fs.createWriteStream(meta.path);
      stream.pipe(outStream);

      delete meta.finalDestination;

      outStream.on("error", reject);
      outStream.on("finish", () => {
        resolve(
          new UploadedFile({
            ...meta,
            size: outStream.bytesWritten,
            delete: function () {
              return new Promise<void>((resolve, reject) => {
                try {
                  if ((this as any).alreadyDeleted) {
                    console.log("THIS SHOULD NOT HAPPEN");
                    return;
                  }
                  (this as any).alreadyDeleted = true;
                  fs.unlinkSync(meta.path);
                  resolve();
                } catch (err) {
                  reject(err);
                }
              });
            },
          })
        );
      });
    });
  };
}
