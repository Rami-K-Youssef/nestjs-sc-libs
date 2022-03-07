import { StorageFunction } from ".";
import {
  SingleFieldUploadOptions,
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
}
