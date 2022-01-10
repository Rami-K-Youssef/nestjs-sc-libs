import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { MongoError } from 'mongodb';

@Catch(MongoError)
export class MongoExceptionFilter implements ExceptionFilter {
  logger = new Logger('MongoExceptionFilter');

  catch(exception: MongoError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    switch (exception.code) {
      case 11000:
        // duplicate exception
        const key = Object.keys(exception['keyPattern'])[0];
        return response.status(HttpStatus.BAD_REQUEST).json({
          code: `${key.toUpperCase()}_ALREADY_USED`,
          message: `${key} must be unique`,
        });
      default:
        this.logger.error(exception);
        return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          timestamp: new Date().toISOString(),
          path: request.url,
          error: exception.message,
        });
    }
  }
}
