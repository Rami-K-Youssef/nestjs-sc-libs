import { Exclude } from "class-transformer";
import { Request } from "express";
import { ServeStaticModuleOptions } from "..";
import { FilePipeline } from "./pipelines";

export interface SingleFieldUploadOptions {
  destination?: string | ((user?: any) => string);
  maxNumFiles: number;
  minNumFiles: number;
  isPrivate?: boolean;
  pipeline?: FilePipeline;
  isOptional?: boolean;
}

export type FieldUploadOptions = Record<string, SingleFieldUploadOptions>;
export interface UploadOptions {
  maxSizeInMegabytes?: number;
  allowedMimeTypes?: RegExp[];
}

export class UploadedFile {
  fieldName?: string;
  fileName: string;
  originalName?: string;
  size?: number;
  mimeType?: string;
  path: string;
  url?: string;
  info?: Record<string, string>;
  processedFiles?: Record<string, UploadedFile>;
  isPrivate: boolean;
  @Exclude()
  delete?: () => Promise<void>;
  @Exclude()
  onSuccess?: (param?: any) => Promise<void>;

  constructor(data: UploadedFile) {
    Object.assign(this, data);
  }
}

export type RequestWithUploadedFiles = Request & {
  uploadedFiles: Record<string, UploadedFile[]>;
};

export enum UploadModuleStorageType {
  LOCAL = "LOCAL",
  AWS = "AWS",
}

export interface LocalStorageOptions {
  storageDir: string;
  publicServePath: string;
  serveStaticOptions: ServeStaticModuleOptions['serveStaticOptions'];
}

export interface AwsStorageOptions {
  privateBucketName?: string;
  publicBucketName: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export interface UploadModuleOptions {
  storageType: UploadModuleStorageType;
  tempDirectory?: string;
  localStorageOptions?: LocalStorageOptions;
  awsStorageOptions?: AwsStorageOptions;
}
