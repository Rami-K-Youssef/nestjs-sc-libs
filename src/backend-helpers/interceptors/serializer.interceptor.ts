import {
  CallHandler,
  ClassSerializerInterceptor,
  ExecutionContext,
  Injectable,
  PlainLiteralObject,
  StreamableFile,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { BaseResponseDto } from "./../../search-pagination/definitions";
import {
  ClassTransformOptions,
  instanceToPlain,
  plainToInstance,
} from "class-transformer";
import { Document } from "mongoose";
import { SearchResult } from "./../../search-pagination/dto/pagination.dto";
import { map } from "rxjs";
import { ClassTransformerOptionsExt } from "../decoractors";
import { plainToDiscrimnator } from "../../search-pagination/transforms";

const IgnoredPropertyName = Symbol("IgnoredPropertyName");

export function CustomInterceptorIgnore() {
  return function (
    target,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    descriptor.value[IgnoredPropertyName] = true;
  };
}
const isObject = (obj) =>
  !(typeof obj === "undefined" || obj === null) && typeof obj === "object";

export type CustomClassSerializerInterceptorPostProcessingFunction = (
  request: any,
  instance: any
) => void;
@Injectable()
export class CustomClassSerializerInterceptor extends ClassSerializerInterceptor {
  constructor(
    protected reflector: Reflector,
    protected postProcessFunction?: CustomClassSerializerInterceptorPostProcessingFunction,
    protected globalData: Record<string, any> = {}
  ) {
    super(reflector);
  }

  intercept(context: ExecutionContext, next: CallHandler) {
    const isIgnored = context.getHandler()[IgnoredPropertyName];
    if (isIgnored) {
      return next.handle();
    } else {
      const dto = this.reflector.get(
        "class_serializer:dto",
        context.getHandler()
      );
      const transformOptions = this.reflector.get(
        "class_serializer:options",
        context.getHandler()
      );
      const groupFn = this.reflector.get(
        "class_serializer:groupFn",
        context.getHandler()
      );
      const handlerData =
        this.reflector.get("class_serializer:data", context.getHandler()) ?? {};

      const request = context.switchToHttp().getRequest();
      const user = request.user;
      const contextOptions = this.getContextOptions(context);
      const options = Object.assign(
        Object.assign({}, this.defaultOptions),
        contextOptions
      );

      const data = {
        ...this.globalData,
        handlerData,
        ...{ ...(user ?? {}) },
      };

      //options.
      return next
        .handle()
        .pipe(
          map((res) =>
            this.cSerialize(
              res,
              { ...options, ...transformOptions, ...{ data } },
              dto,
              groupFn,
              request,
              user
            )
          )
        );
    }
  }

  cSerialize(
    response: PlainLiteralObject | PlainLiteralObject[],
    transformOptions: ClassTransformerOptionsExt,
    dto: typeof BaseResponseDto,
    groupFn: (item: any, user?: any) => string[],
    request: any,
    user: any
  ): PlainLiteralObject | PlainLiteralObject[] {
    if (!isObject(response) || response instanceof StreamableFile) {
      return response;
    }

    const fn = (obj) => {
      if (obj instanceof Document) {
        const options = { ...(transformOptions ?? {}) };
        const item = obj.toObject();
        if (groupFn) options.groups = groupFn(item, user);
        const instance = options.discriminator
          ? (plainToDiscrimnator(
              options.discriminator,
              item,
              options
            ) as BaseResponseDto)
          : plainToInstance(dto, item, options);
        if (this.postProcessFunction) {
          this.postProcessFunction(request, instance);
        }
        return instanceToPlain(instance, options);
      } else if (obj instanceof BaseResponseDto) {
        if (this.postProcessFunction) {
          this.postProcessFunction(request, obj);
        }
        return instanceToPlain(obj, transformOptions);
      } else {
        const options = { ...(transformOptions ?? {}) };
        const item = obj;
        if (groupFn) options.groups = groupFn(item, user);
        const instance = options.discriminator
          ? (plainToDiscrimnator(
              options.discriminator,
              item,
              options
            ) as BaseResponseDto)
          : plainToInstance(dto, item, options);
        if (this.postProcessFunction) {
          this.postProcessFunction(request, instance);
        }
        return instanceToPlain(instance, options);
      }
    };

    if (response instanceof SearchResult) {
      const data = response.data.map(fn);
      return { data, pagination: response.pagination };
    } else if (Array.isArray(response)) {
      return response.map(fn);
    } else {
      return fn(response);
    }
  }
}
