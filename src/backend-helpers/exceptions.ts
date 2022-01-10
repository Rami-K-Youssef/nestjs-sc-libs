import { HttpException, HttpStatus, NotFoundException } from '@nestjs/common';

export class CodedException extends Error {
  errCode: string;
  err: HttpException;
  args: any;
  public response: string | Record<string, any>;
  constructor(response?: string | Record<string, any>) {
    super(
      response
        ? typeof response == 'string'
          ? response
          : JSON.stringify(response)
        : null,
    );
    this.response = response;
  }
}

export function GenCodedException(
  status: HttpStatus,
  code: string,
): typeof CodedException {
  class InternalCodedException extends CodedException {
    errCode = code;
    constructor(response: string | Record<string, any>) {
      super(response);
      this.err = new HttpException(response, status);
    }
  }
  return InternalCodedException;
}

export function ResourceNotFoundException(
  resourceName: string,
  code = `${resourceName}_NOT_FOUND`,
): typeof CodedException {
  class InternalNotFoundException extends CodedException {
    errCode = code;
    constructor() {
      super(`${resourceName} not found`);
      this.err = new NotFoundException(`${resourceName} not found`);
    }
  }
  return InternalNotFoundException;
}
