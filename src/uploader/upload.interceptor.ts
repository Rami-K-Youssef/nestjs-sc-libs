import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  NotFoundException,
  mixin,
} from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import multer from "multer";
import { catchError, Observable, tap } from "rxjs";
import { RequestWithUploadedFiles, UploadedFile } from ".";
import { FileMissingException, InvalidMimeTypeException } from "./exceptions";
import { FieldUploadOptions, UploadOptions } from "./interfaces";
import { BaseUploadInterceptor } from "./local-upload.interceptor";
import { generateStorageEngine } from "./storage";
import { StorageProvider } from "./storage/provider";

function checkFileType(
  mimeRegexes: RegExp[],
  file: Express.Multer.File,
  cb: (Error?, boolean?) => void
) {
  if (!mimeRegexes) return cb(null, true);
  const mimeType = mimeRegexes.some((regex) => regex.test(file.mimetype));
  if (mimeType) {
    return cb(null, true);
  } else {
    cb(
      new InvalidMimeTypeException({
        mimeType: file.mimetype,
        allowedTypes: mimeRegexes,
        fieldName: file.fieldname,
        originalName: file.originalname,
      })
    );
  }
}

export function UploadInterceptor(
  fileDescriptors: FieldUploadOptions,
  options?: UploadOptions
): new (...args: any[]) => NestInterceptor {
  @Injectable()
  class InternalUploadInterceptor
    extends BaseUploadInterceptor
    implements NestInterceptor
  {
    constructor(protected readonly storageProvider: StorageProvider) {
      super(storageProvider);
    }

    async intercept(
      context: ExecutionContext,
      next: CallHandler<any>
    ): Promise<Observable<any>> {
      const httpContext = context.switchToHttp();
      const request = httpContext.getRequest<RequestWithUploadedFiles>();

      const fields = Object.entries(fileDescriptors).map(
        ([field, fieldOptions]) => {
          const maxCount = fieldOptions.maxNumFiles ?? 1;
          return {
            name: field,
            maxCount,
          };
        }
      );
      const limits = {} as Record<string, any>;
      if (options && options.maxSizeInMegabytes)
        limits.fileSize = options.maxSizeInMegabytes * 1024 * 1024;
      const upload = multer({
        limits,
        storage: generateStorageEngine(
          { fileDescriptors },
          this.storageProvider,
          request["user"]
        ),
        fileFilter: function (req, file, cb) {
          checkFileType(options?.allowedMimeTypes, file, cb);
        },
      }).fields(fields);

      request.uploadedFiles = {} as Record<string, UploadedFile[]>;
      const response = httpContext.getResponse<Response>();

      await new Promise<void>((resolve, reject) => {
        upload(request, response, async (err) => {
          if (err) {
            reject(err);
          }
          resolve();
        });
      });

      function deleteFilesOnError() {
        Object.values(request.uploadedFiles)
          .flatMap((item) => item)
          .forEach((uploadedFile: UploadedFile) => {
            if (uploadedFile.delete) uploadedFile.delete().catch(console.error);
            if (uploadedFile.processedFiles)
              Object.values(uploadedFile.processedFiles).forEach((file) => {
                if (file.delete) file.delete().catch(console.error);
              });
          });
      }

      Object.entries(fileDescriptors).forEach(([fieldName, descriptor]) => {
        if (
          !descriptor.isOptional &&
          (!request.uploadedFiles[fieldName] ||
            request.uploadedFiles[fieldName].length == 0)
        ) {
          deleteFilesOnError();
          throw new FileMissingException({ fieldName });
        }
      });

      return next.handle().pipe(
        tap(async (res) => {
          const param = this.storageProvider.getOnSuccessParam();
          Object.values(request.uploadedFiles)
            .flatMap((item) => item)
            .forEach((uploadedFile: UploadedFile) => {
              if (uploadedFile.onSuccess)
                uploadedFile.onSuccess(param).catch(console.error);
              if (uploadedFile.processedFiles)
                Object.values(uploadedFile.processedFiles).forEach((file) => {
                  if (file.onSuccess)
                    file.onSuccess(param).catch(console.error);
                });
            });
        }),
        catchError((err) => {
          deleteFilesOnError();
          return Promise.reject(err);
        })
      );
    }
  }
  return mixin(InternalUploadInterceptor);
}
