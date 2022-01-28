import {
  CallHandler,
  ClassSerializerInterceptor,
  ExecutionContext,
  Injectable,
  PlainLiteralObject,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { BaseResponseDto } from "./../../search-pagination/definitions";
import { ClassTransformOptions, plainToInstance } from "class-transformer";
import { Document } from "mongoose";
import { SearchResult } from "./../../search-pagination/dto/pagination.dto";

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

@Injectable()
export class CustomClassSerializerInterceptor extends ClassSerializerInterceptor {
  private dto: typeof BaseResponseDto;
  private transformOptions: ClassTransformOptions;
  constructor(protected reflector: Reflector) {
    super(reflector);
  }

  intercept(context: ExecutionContext, next: CallHandler) {
    const isIgnored = context.getHandler()[IgnoredPropertyName];
    if (isIgnored) {
      return next.handle();
    } else {
      this.dto = this.reflector.get(
        "class_serializer:dto",
        context.getHandler()
      );
      this.transformOptions = this.reflector.get(
        "class_serializer:options",
        context.getHandler()
      );
      return super.intercept(context, next);
    }
  }

  serialize(
    response: PlainLiteralObject | PlainLiteralObject[],
    options: ClassTransformOptions
  ): PlainLiteralObject | PlainLiteralObject[] {
    const fn = (obj) => {
      if (obj instanceof Document)
        return plainToInstance(this.dto, obj.toObject(), this.transformOptions);
      else if (obj instanceof BaseResponseDto) return obj;
      else return plainToInstance(this.dto, obj, this.transformOptions);
    };
    if (response instanceof SearchResult) {
      delete response.paginate;
      const data = super.serialize(response.data.map(fn), options);
      return { data, pagination: response.pagination };
    } else if (Array.isArray(response)) {
      return super.serialize(response.map(fn), options);
    } else {
      return super.serialize(fn(response), options);
    }
  }
}
