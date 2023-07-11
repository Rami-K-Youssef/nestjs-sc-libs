import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from "@nestjs/common";
import { Response } from "express";
import { JsonWebTokenError } from "jsonwebtoken";
@Catch(JsonWebTokenError)
export class JwtExceptionFilter implements ExceptionFilter {
  catch(exception: JsonWebTokenError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let statusCode: HttpStatus;
    let message = exception.message;
    switch (exception.name) {
      case "JsonWebTokenError":
      case "TokenExpiredError":
      case "NotBeforeError":
        statusCode = HttpStatus.BAD_REQUEST;
        break;
      default:
        console.log(exception);
        statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        message = "Internal server error";
        break;
    }

    response.status(statusCode).json({ statusCode, message });
  }
}
