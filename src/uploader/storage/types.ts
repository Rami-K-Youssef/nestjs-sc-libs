import { SingleFieldUploadOptions } from "..";
import { FieldUploadOptions, UploadedFile } from "../interfaces";
import { Readable } from "stream";

export type CustomStorageOptions = {
  fileDescriptors: FieldUploadOptions;
};

export type StorageFunction = (
  file: Express.Multer.File,
  name: string,
  readStream: Readable,
  options: SingleFieldUploadOptions,
  user?: any
) => Promise<UploadedFile>;
