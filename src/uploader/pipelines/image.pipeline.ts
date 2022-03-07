import { FilePipeline } from "./pipeline-base";
import sharp from "sharp";
import { ImageResizeOptions, ImageValidationOptions } from ".";
import { InvalidAspectRatioException } from "../exceptions";
import { StorageFunction } from "../storage";
import { UploadedFile } from "..";
import { Readable } from "stream";
import { BaseStorageManager } from "../storage/storage-manager.base";

export class ImagePipeline extends FilePipeline {
  protected _originalFileMetadata: sharp.Metadata;

  persist(name?: string): ImagePipeline {
    return super.persist(name) as ImagePipeline;
  }

  validate(options: ImageValidationOptions): ImagePipeline {
    this._actions.push({
      skipStream: true,
      name: null,
      method: validate,
      args: [options],
    });
    return this;
  }

  thumb(name: string, options: ImageResizeOptions): ImagePipeline {
    this._actions.push({
      skipStream: true,
      name,
      method: createThumbnail,
      args: [options],
    });
    return this;
  }
}

async function validate(
  this: ImagePipeline,
  $0: string,
  file: Partial<Express.Multer.File>,
  $1: UploadedFile | null,
  $2: Readable,
  $3: BaseStorageManager,
  $4: any,
  options: ImageValidationOptions
): Promise<UploadedFile> {
  const meta = await getMeta.call(this);
  if (options.aspectRatio) {
    const { min, max } = options.aspectRatio;
    const { width, height } = meta;
    const aspectRatio = width / height;
    if (aspectRatio < min || aspectRatio > max)
      throw new InvalidAspectRatioException({
        min: min,
        max: max,
        received: aspectRatio,
        fieldName: file.fieldname,
        originalName: file.originalname,
      });
  }
  return null;
}

async function getMeta(this: ImagePipeline): Promise<sharp.Metadata> {
  if (!this._originalFileMetadata) {
    this._originalFileMetadata = await sharp(this._tempFilePath).metadata();
  }
  return this._originalFileMetadata;
}

async function createThumbnail(
  this: ImagePipeline,
  name: string,
  file: Partial<Express.Multer.File>,
  $1: UploadedFile | null,
  $2: Readable,
  storageManager: BaseStorageManager,
  user: any,
  options: ImageResizeOptions
) {
  const resizeOptions = options.options ?? ({} as sharp.ResizeOptions);
  if (!resizeOptions.fit) resizeOptions.fit = "cover";
  const stream = sharp(this._tempFilePath).resize(
    options.width,
    options.height,
    resizeOptions
  );
  return await storageManager.getStorageFunc()(
    file,
    name,
    stream,
    this.options,
    user
  );
}
