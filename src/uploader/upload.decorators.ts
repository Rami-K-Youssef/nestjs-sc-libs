import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { RequestWithUploadedFiles, UploadedFile } from ".";

export const UploadedFilesByField = createParamDecorator(
  (fieldName: string, ctx: ExecutionContext): UploadedFile[] => {
    const request = ctx.switchToHttp().getRequest<RequestWithUploadedFiles>();

    return request.uploadedFiles[fieldName] ?? [];
  }
);

export const UploadedSingleFileByField = createParamDecorator(
  (fieldName: string, ctx: ExecutionContext): UploadedFile => {
    const request = ctx.switchToHttp().getRequest<RequestWithUploadedFiles>();
    if (!request.uploadedFiles[fieldName]) return null;
    return request.uploadedFiles[fieldName][0];
  }
);
