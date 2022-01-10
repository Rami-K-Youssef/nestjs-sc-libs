import { ForbiddenError } from '@casl/ability';
import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
@Catch(ForbiddenError)
export class CaslForbiddenFilter implements ExceptionFilter {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  catch(exception: ForbiddenError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    response.status(HttpStatus.FORBIDDEN).json({
      statusCode: HttpStatus.FORBIDDEN,
      message: `Access Denied`,
    });
  }
}
