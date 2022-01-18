import {
  CallHandler,
  ClassSerializerInterceptor,
  ExecutionContext,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

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
  constructor(protected reflector: Reflector) {
    super(reflector);
  }

  intercept(context: ExecutionContext, next: CallHandler) {
    const isIgnored = context.getHandler()[IgnoredPropertyName];
    if (isIgnored) {
      return next.handle();
    } else {
      return super.intercept(context, next);
    }
  }
}
