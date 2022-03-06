import sharp from "sharp";
import { Readable } from "stream";
import { StorageFunction } from "../storage";
import { UploadedFile } from "../interfaces";
import { BaseStorageManager } from "../storage/storage-manager.base";

export interface PipelineAction {
  method: (
    name: string,
    file: Partial<Express.Multer.File>,
    stream: Readable,
    storageManager: BaseStorageManager,
    user?: any,
    ...args: any[]
  ) => Promise<UploadedFile>;
  args?: any[];
  name: string;
  skipStream?: boolean;
}

export type ImageValidationOptions = {
  aspectRatio?: {
    min: number;
    max: number;
  };
};

export type ImageResizeOptions = {
  width: number;
  height: number;
  options?: sharp.ResizeOptions;
};
