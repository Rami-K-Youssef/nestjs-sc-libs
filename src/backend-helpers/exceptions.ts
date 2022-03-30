import { HttpException, HttpStatus, NotFoundException } from "@nestjs/common";
import { Localization } from "..";

export class CodedException<T extends string | number> extends Error {
  errCode: string;
  err: HttpException;
  args: any;
  errMessage: Localization<T>;
  public response: string | Record<string, any>;
  constructor(response?: string | Record<string, any>, args?: any) {
    super(
      response
        ? typeof response == "string"
          ? response
          : JSON.stringify(response)
        : null
    );
    this.response = response;
    this.args = args;
  }
}

export function GenCodedException<T extends string | number>(
  status: HttpStatus,
  code: string,
  errMessage?: Localization<T>
): new (
  response?: string | Record<string, any>,
  args?: any
) => CodedException<any> {
  class InternalCodedException extends CodedException<T> {
    errCode = code;
    errMessage = errMessage;
    constructor(response?: string | Record<string, any>, args?: any) {
      super(response, args);
      this.err = new HttpException(response, status);
    }
  }
  return InternalCodedException;
}

export function ResourceNotFoundException<T extends number | string>(
  resourceName: string,
  errMessage?: Localization<T>,
  code = `${resourceName}_NOT_FOUND`
): typeof CodedException {
  class InternalNotFoundException extends CodedException<T> {
    errCode = code;
    errMessage = errMessage;
    constructor() {
      super(`${resourceName} not found`);
      this.err = new NotFoundException(`${resourceName} not found`);
    }
  }
  //@ts-ignore
  return InternalNotFoundException;
}
