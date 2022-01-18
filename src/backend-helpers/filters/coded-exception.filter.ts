import { ArgumentsHost, Catch, ExceptionFilter } from "@nestjs/common";
import { Response } from "express";
import { CodedException } from "./../exceptions";

export function handleCodedException(
  exception: CodedException,
  host: ArgumentsHost
) {
  const ctx = host.switchToHttp();
  const response = ctx.getResponse<Response>();

  const args = exception.args;

  response.status(exception.err.getStatus()).json({
    statusCode: exception.err.getStatus(),
    errCode: exception.errCode,
    message: exception.response,
    args,
  });
}

@Catch(CodedException)
export class CodedExceptionFilter implements ExceptionFilter {
  catch(exception: CodedException, host: ArgumentsHost) {
    handleCodedException(exception, host);
  }
}
