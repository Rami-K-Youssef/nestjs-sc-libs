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

@Injectable()
export class CustomClassSerializerInterceptor extends ClassSerializerInterceptor {
  constructor(protected reflector: Reflector) {
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
      const user = context.switchToHttp().getRequest().user;
      const contextOptions = this.getContextOptions(context);
      const options = Object.assign(
        Object.assign({}, this.defaultOptions),
        contextOptions
      );
      return next
        .handle()
        .pipe(
          map((res) =>
            this.cSerialize(
              res,
              { ...options, ...transformOptions },
              dto,
              groupFn,
              user
            )
          )
        );
    }
  }

  cSerialize(
    response: PlainLiteralObject | PlainLiteralObject[],
    transformOptions: ClassTransformOptions,
    dto: typeof BaseResponseDto,
    groupFn: (item: any, user?: any) => string[],
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
        return instanceToPlain(plainToInstance(dto, item, options), options);
      } else if (obj instanceof BaseResponseDto)
        return instanceToPlain(obj, transformOptions);
      else {
        const options = { ...(transformOptions ?? {}) };
        const item = obj;
        if (groupFn) options.groups = groupFn(item, user);
        return instanceToPlain(plainToInstance(dto, obj, options), options);
      }
    };

    if (response instanceof SearchResult) {
      delete response.paginate;
      const data = response.data.map(fn);
      return { data, pagination: response.pagination };
    } else if (Array.isArray(response)) {
      return response.map(fn);
    } else {
      return fn(response);
    }
  }
}
