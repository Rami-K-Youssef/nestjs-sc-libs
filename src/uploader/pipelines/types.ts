import sharp from "sharp";
import { Readable } from "stream";
import { UploadedFile } from "../interfaces";
import {
  BaseStorageManager,
  DownloadableFile,
} from "../storage/storage-manager.base";

export interface PipelineAction {
  method: (
    name: string,
    file: Partial<Express.Multer.File>,
    parentFile: UploadedFile | null,
    stream: Readable,
    storageManager: BaseStorageManager,
    user?: any,
    ...args: any[]
  ) => Promise<UploadedFile>;
  args?: any[];
  name: string;
  skipStream?: boolean;
  extension?: string;
  execFirst?: boolean;
}

export type ImageValidationOptions = {
  aspectRatio?: {
    min: number;
    max: number;
  };
  requireAlpha?: boolean;
};

export type ImageResizeOptions = {
  width: number;
  height: number;
  options?: sharp.ResizeOptions;
};

export type WatermarkOptions = {
  fn: (user: any) => DownloadableFile | Promise<DownloadableFile>;
  thisArg?: any;
  requiredWidthRatio?: number; // 0.16
  borderRadiusRatio?: number; // 0.02
  opacityWithoutAlpha?: number; // 30%
  opacityWithAlpha?: number; // 70%
  execBeforeMainImage?: boolean;
};
