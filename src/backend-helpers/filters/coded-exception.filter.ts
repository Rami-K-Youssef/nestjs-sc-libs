import { ArgumentsHost, Catch, ExceptionFilter } from "@nestjs/common";
import { Response, Request } from "express";
import { CodedException } from "./../exceptions";

@Catch(CodedException)
export class CodedExceptionFilter<T extends string | number = "">
  implements ExceptionFilter
{
  catch(exception: CodedException<T>, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    response
      .status(exception.err.getStatus())
      .json(this.mapExceptionToResponse(request, exception));
  }

  protected mapExceptionToResponse(
    request: Request,
    exception: CodedException<T>
  ) {
    return {
      statusCode: exception.err.getStatus(),
      errCode: exception.errCode,
      message: exception.response,
      args: exception.args,
    };
  }
}
