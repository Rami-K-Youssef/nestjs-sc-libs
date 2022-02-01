import { createParamDecorator, ExecutionContext } from "@nestjs/common";

import { SetMetadata } from "@nestjs/common";
import { BaseResponseDto } from "./../search-pagination/definitions";
import {
  ClassTransformOptions,
  DiscriminatorDescriptor,
} from "class-transformer";
import { applyDecorators } from "@nestjs/common";

export const RequestUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    return ctx.switchToHttp().getRequest().user;
  }
);

export interface ClassTransformerOptionsExt extends ClassTransformOptions {
  discriminator?: DiscriminatorDescriptor;
}

export function TransformDto(
  dto: (...args: any[]) => unknown,
  options?: ClassTransformerOptionsExt,
  groupFn?: (item: any, user?: any) => string[]
) {
  return applyDecorators(
    SetMetadata("class_serializer:options", options),
    SetMetadata("class_serializer:dto", dto),
    SetMetadata("class_serializer:groupFn", groupFn)
  );
}
