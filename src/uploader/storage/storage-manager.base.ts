import { Readable, Writable } from "stream";
import { StorageFunction } from ".";
import {
  SingleFieldUploadOptions,
  UploadedFile,
  UploadModuleOptions,
  UploadModuleStorageType,
} from "..";

export type GeneratedFileAttributes = {
  url: string | null;
  path: string;
  isPrivate: boolean;
  fileName: string;

  fieldName?: string;
  originalName?: string;
  mimeType?: string;

  finalDestination?: string;
};

export type DownloadableFile = {
  originalName?: string;
  overrideName?: string;
  path: string;
  url?: string;
  isPrivate: boolean;
};

export abstract class BaseStorageManager {
  constructor(protected readonly options: UploadModuleOptions) {}

  public abstract getStorageFunc(): StorageFunction;
  public abstract getFileMetadata(
    file: Partial<Express.Multer.File>,
    name: string,
    options: SingleFieldUploadOptions,
    user?: any
  ): GeneratedFileAttributes;
  public abstract getStorageType(): UploadModuleStorageType;
  public abstract store(
    meta: GeneratedFileAttributes,
    stream: Readable
  ): Promise<UploadedFile>;

  public abstract getFileBuffer(file: DownloadableFile): Promise<Buffer>;

  public abstract deleteFile(file: DownloadableFile): Promise<void>;

  public abstract pipeFile(
    file: DownloadableFile,
    writable: Writable
  ): Promise<void>;

  public abstract zipMultipleFiles(
    files: Array<DownloadableFile>,
    writable: Writable
  ): Promise<void>;
}
