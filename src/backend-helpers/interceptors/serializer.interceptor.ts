import { isRabbitContext } from "@golevelup/nestjs-rabbitmq";
import {
  CallHandler,
  ClassSerializerInterceptor,
  ExecutionContext,
  Injectable,
  PlainLiteralObject,
  StreamableFile,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { instanceToPlain, plainToInstance } from "class-transformer";
import { Request } from "express";
import { Document } from "mongoose";
import { map } from "rxjs";
import { plainToDiscriminator } from "../../search-pagination/transforms";
import { ClassTransformerOptionsExt } from "../decoractors";
import { BaseResponseDto } from "./../../search-pagination/definitions";
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
    protected globalData: Record<string, any> = {},
    protected extractRequestDataFunction?: (
      request: Request
    ) => Record<string, any>
  ) {
    super(reflector);
  }

  intercept(context: ExecutionContext, next: CallHandler) {
    const isIgnored =
      context.getHandler()[IgnoredPropertyName] || isRabbitContext(context);
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
      const searchResultCls = this.reflector.get(
        "class_serializer:searchResultCls",
        context.getHandler()
      );
      const handlerData =
        this.reflector.get("class_serializer:data", context.getHandler()) ?? {};

      const request = context.switchToHttp().getRequest();
      const contextOptions = this.getContextOptions(context);
      const options = Object.assign(
        Object.assign({}, this.defaultOptions),
        contextOptions
      );

      //options.
      return next.handle().pipe(
        map((res) => {
          const requestData = this.extractRequestDataFunction
            ? this.extractRequestDataFunction(request)
            : {};
          const user = request.user;

          const data = {
            ...this.globalData,
            handlerData,
            user,
            requestData,
          };
          return this.cSerialize(
            res,
            { ...options, ...transformOptions, ...{ data } },
            dto,
            groupFn,
            request,
            user,
            searchResultCls
          );
        })
      );
    }
  }

  cSerialize(
    response: PlainLiteralObject | PlainLiteralObject[],
    transformOptions: ClassTransformerOptionsExt,
    dto: typeof BaseResponseDto,
    groupFn: (item: any, user?: any) => string[],
    request: any,
    user: any,
    searchResultCls: typeof BaseResponseDto
  ): PlainLiteralObject | PlainLiteralObject[] {
    if (
      !isObject(response) ||
      response instanceof StreamableFile ||
      dto == null
    ) {
      return response;
    }

    const options = transformOptions ?? {};

    const fn = (obj) => {
      if (obj instanceof Document) {
        const item = obj.toObject();
        const oldGroups = options.groups;
        if (groupFn) options.groups = groupFn(item, user);
        const instance = options.discriminator
          ? (plainToDiscriminator(
              options.discriminator,
              item,
              options
            ) as BaseResponseDto)
          : plainToInstance(dto, item, options);
        options.groups = oldGroups;
        if (this.postProcessFunction && !options.skipPostProcessing) {
          this.postProcessFunction(request, instance);
        }
        return instance;
      } else if (obj instanceof BaseResponseDto) {
        if (
          this.postProcessFunction &&
          !(transformOptions ?? {}).skipPostProcessing
        ) {
          this.postProcessFunction(request, obj);
        }
        return obj;
      } else {
        const item = obj;
        const oldGroups = options.groups;
        if (groupFn) options.groups = groupFn(item, user);
        const instance = options.discriminator
          ? (plainToDiscriminator(
              options.discriminator,
              item,
              options
            ) as BaseResponseDto)
          : plainToInstance(dto, item, options);
        options.groups = oldGroups;
        if (this.postProcessFunction && !options.skipPostProcessing) {
          this.postProcessFunction(request, instance);
        }
        return instance;
      }
    };

    if (response instanceof SearchResult) {
      const data = response.data.map(fn);
      const pagination = response.pagination;

      if (searchResultCls) {
        const item = response;
        const oldGroups = options.groups;
        if (groupFn) options.groups = groupFn(item, user);
        const instance = plainToInstance(searchResultCls, item, options);
        options.groups = oldGroups;
        if (this.postProcessFunction && !options.skipPostProcessing) {
          this.postProcessFunction(request, instance);
        }
        return { ...instance, data, pagination };
      } else {
        return { data, pagination };
      }
    } else if (Array.isArray(response)) {
      return response.map(fn);
    } else {
      return fn(response);
    }
  }
}
