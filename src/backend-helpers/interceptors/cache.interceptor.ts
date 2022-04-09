import {
  CallHandler,
  ExecutionContext,
  CacheInterceptor,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { isRabbitContext } from "@golevelup/nestjs-rabbitmq";

const CachePropertyName = Symbol("CacheThisApiSymbol");

export function CacheThisEndpoint() {
  return function (
    target,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    descriptor.value[CachePropertyName] = true;
  };
}

@Injectable()
export class CustomCacheInterceptor extends CacheInterceptor {
  constructor(cacheManager: any, reflector: Reflector) {
    super(cacheManager, reflector);
  }

  intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Promise<Observable<any>> {
    const shouldSkip = isRabbitContext(context);
    if (shouldSkip) {
      return next.handle() as any;
    }
    const doCache = context.getHandler()[CachePropertyName];
    if (!doCache) {
      return Promise.resolve(next.handle());
    } else {
      return super.intercept(context, next);
    }
  }
}
