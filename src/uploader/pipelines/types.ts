import sharp from "sharp";
import { Readable } from "stream";
import { StorageFunction } from "../storage";
import { UploadedFile } from "../interfaces";

export interface PipelineAction {
  method: (
    name: string,
    file: Express.Multer.File,
    stream: Readable,
    storageCallback: StorageFunction,
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
