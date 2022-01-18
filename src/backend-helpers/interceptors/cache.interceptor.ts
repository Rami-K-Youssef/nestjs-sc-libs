import {
  CallHandler,
  ExecutionContext,
  CacheInterceptor,
  Injectable,
} from "@nestjs/common";
import { Observable } from "rxjs";

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
  intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Promise<Observable<any>> {
    const doCache = context.getHandler()[CachePropertyName];
    if (!doCache) {
      return Promise.resolve(next.handle());
    } else {
      return super.intercept(context, next);
    }
  }
}
