import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithUploadedFiles, UploadedFile } from '.';

export const UploadedFilesByField = createParamDecorator(
  (fieldName: string, ctx: ExecutionContext): UploadedFile[] => {
    const request = ctx.switchToHttp().getRequest<RequestWithUploadedFiles>();
    if (!request.uploadedFiles[fieldName])
      throw new Error(`Unknown field ${fieldName}`);
    return request.uploadedFiles[fieldName];
  },
);

export const UploadedSingleFileByField = createParamDecorator(
  (fieldName: string, ctx: ExecutionContext): UploadedFile => {
    const request = ctx.switchToHttp().getRequest<RequestWithUploadedFiles>();
    if (!request.uploadedFiles[fieldName])
      throw new Error(`Unknown field ${fieldName}`);
    return request.uploadedFiles[fieldName][0];
  },
);
