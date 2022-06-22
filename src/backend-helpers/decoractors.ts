import {
  applyDecorators,
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from "@nestjs/common";
import { ApiResponse, refs } from "@nestjs/swagger";
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
  let responseDecorator: any;
  if (options?.discriminator) {
    const dtos = options.discriminator.subTypes.map((subtype) => subtype.value);
    responseDecorator = ApiResponse({
      schema: {
        anyOf: refs(...(dtos as any)),
      },
    });
  } else {
    responseDecorator = ApiResponse({ type: dto });
  }
  return applyDecorators(
    SetMetadata("class_serializer:options", options),
    SetMetadata("class_serializer:dto", dto),
    SetMetadata("class_serializer:groupFn", groupFn),
    responseDecorator
  );
}
