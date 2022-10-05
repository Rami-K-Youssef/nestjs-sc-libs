import sharp from "sharp";
import { Readable } from "stream";
import {
  ImageResizeOptions,
  ImageValidationOptions,
  WatermarkOptions,
} from ".";
import { UploadedFile } from "..";
import {
  instantiateImageMissingAlphaChannelException,
  instantiateInvalidAspectRatioException,
} from "../exceptions";
import {
  BaseStorageManager,
  DownloadableFile,
} from "../storage/storage-manager.base";
import { FilePipeline } from "./pipeline-base";

export class ImagePipeline extends FilePipeline {
  protected _originalFileMetadata: sharp.Metadata;
  protected _watermarkFile: DownloadableFile;
  protected _watermark: {
    file: DownloadableFile;
    meta: sharp.Metadata;
    buffer: Buffer;
    options: WatermarkOptions;
  };

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

  watermark(options: WatermarkOptions): ImagePipeline {
    this._actions.push({
      skipStream: true,
      name: null,
      method: watermark,
      args: [options],
      execFirst: options.execBeforeMainImage,
    });
    return this;
  }

  thumb(
    name: string,
    options: ImageResizeOptions,
    quality = 80,
    isMain = false
  ): ImagePipeline {
    const action = {
      skipStream: true,
      name,
      method: createThumbnail,
      args: [options, quality],
      extension: ".webp",
    };
    if (isMain) this._mainFileAction = action;
    else this._actions.push(action);
    return this;
  }
}

async function watermark(
  this: ImagePipeline,
  $0: string,
  $1: Partial<Express.Multer.File>,
  $2: UploadedFile | null,
  $3: Readable,
  storageManager: BaseStorageManager,
  user: any,
  options: WatermarkOptions
) {
  this._watermarkFile = await options.fn.call(options.thisArg, user);
  if (this._watermarkFile) {
    const buffer = await storageManager.getFileBuffer(this._watermarkFile);
    const meta = await sharp(buffer).metadata();
    this._watermark = {
      buffer,
      meta,
      file: this._watermarkFile,
      options,
    };
  }
  return null;
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
      throw instantiateInvalidAspectRatioException({
        min: min,
        max: max,
        received: aspectRatio,
        fieldName: file.fieldname,
        originalName: file.originalname,
      });
  }
  if (options.requireAlpha && !meta.hasAlpha)
    throw instantiateImageMissingAlphaChannelException();
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
  options: ImageResizeOptions,
  quality: number
) {
  const resizeOptions = options.options ?? ({} as sharp.ResizeOptions);
  if (!resizeOptions.fit) resizeOptions.fit = "cover";
  const stream = sharp(this._tempFilePath).resize(
    options.width,
    options.height,
    resizeOptions
  );
  if (this._watermark) {
    // center
    const watermark = this._watermark;
    let finalImageWidth: number;
    let finalImageHeight: number;

    const imageMetadata = await getMeta.call(this);
    if (imageMetadata.width > imageMetadata.height) {
      finalImageWidth = options.width;
      finalImageHeight = Math.floor(
        (finalImageWidth * imageMetadata.height) / imageMetadata.width
      );
    } else {
      finalImageHeight = options.height;
      finalImageWidth = Math.floor(
        (finalImageHeight * imageMetadata.width) / imageMetadata.height
      );
    }

    let finalWatermarkWidth = Math.ceil(
      (watermark.options.requiredWidthRatio ?? 0.16) * finalImageWidth
    );
    let finalWatermarkHeight = Math.ceil(
      (finalWatermarkWidth * watermark.meta.height) / watermark.meta.width
    );

    if (finalWatermarkWidth > finalImageWidth) {
      finalWatermarkWidth = finalImageWidth;
      finalWatermarkHeight = Math.floor(
        (finalWatermarkWidth * watermark.meta.height) / watermark.meta.width
      );
    } else if (finalWatermarkHeight > finalImageHeight) {
      finalWatermarkHeight = finalImageHeight;
      finalWatermarkWidth = Math.floor(
        (finalImageHeight * watermark.meta.width) / watermark.meta.height
      );
    }

    const watermarkSharp = sharp(watermark.buffer).resize({
      width: finalWatermarkWidth,
      height: finalWatermarkHeight,
    });
    const opacity = watermark.meta.hasAlpha
      ? watermark.options.opacityWithAlpha ?? 1
      : watermark.options.opacityWithoutAlpha ?? 0.16;
    const rect = Buffer.from(
      `<svg><rect x="0" y="0" width="${finalWatermarkWidth}" height="${finalWatermarkHeight}" rx="${Math.ceil(
        finalImageWidth * (watermark.options.borderRadiusRatio ?? 0.02)
      )}" ry="${
        finalImageWidth * (watermark.options.borderRadiusRatio ?? 0.02)
      }" opacity="${opacity}"/></svg>`
    );
    watermarkSharp.composite([
      {
        input: rect,
        blend: "dest-in",
      },
    ]);

    stream.composite([
      {
        input: await watermarkSharp.toBuffer(),
      },
    ]);
  }
  stream.webp({ quality });
  return await storageManager.getStorageFunc()(
    file,
    name,
    stream,
    this.options,
    user
  );
}
