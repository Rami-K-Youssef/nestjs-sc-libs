import {
  applyDecorators,
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from "@nestjs/common";
import {
  ClassTransformOptions,
  DiscriminatorDescriptor,
} from "class-transformer";

export const RequestUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    return ctx.switchToHttp().getRequest().user;
  }
);

export interface ClassTransformerOptionsExt extends ClassTransformOptions {
  discriminator?: DiscriminatorDescriptor;
  skipPostProcessing?: boolean;
}

export function TransformDto(
  dto: new (...args: any[]) => unknown,
  options?: ClassTransformerOptionsExt,
  groupFn?: (item: any, user?: any) => string[]
) {
  return applyDecorators(
    SetMetadata("class_serializer:options", options),
    SetMetadata("class_serializer:dto", dto),
    SetMetadata("class_serializer:groupFn", groupFn)
  );
}
