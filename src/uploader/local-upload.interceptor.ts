import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { StorageProvider } from "./storage/provider";

@Injectable()
export abstract class BaseUploadInterceptor implements NestInterceptor {
  constructor(protected readonly storage: StorageProvider) {}
  abstract intercept(
    context: ExecutionContext,
    next: CallHandler<any>
  ): Observable<any> | Promise<Observable<any>>;
}
