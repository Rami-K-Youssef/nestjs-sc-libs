import { HttpStatus } from '@nestjs/common';
import { GenCodedException } from './../backend-helpers/exceptions';

export class InvalidAspectRatioException extends GenCodedException(
  HttpStatus.BAD_REQUEST,
  'ASPECT_RATIO_INVALID',
) {
  constructor(args: {
    min: number;
    max: number;
    received: number;
    fieldName: string;
    originalName: string;
  }) {
    super('Invalid Aspect Ratio', args);
  }
}

export class InvalidMimeTypeException extends GenCodedException(
  HttpStatus.BAD_REQUEST,
  'MIME_TYPE_INVALID',
) {
  constructor(args: {
    mimeType: string;
    allowedTypes: RegExp[];
    fieldName: string;
    originalName: string;
  }) {
    (args as any).allowedTypes = args.allowedTypes.map((regex) =>
      regex.toString(),
    );
    super('Invalid Mime Type', args);
  }
}

export class FileMissingException extends GenCodedException(
  HttpStatus.BAD_REQUEST,
  'FILE_REQUIRED',
) {
  constructor(args: { fieldName: string }) {
    super('File Required', args);
  }
}

export class FileNotFoundException extends GenCodedException(
  HttpStatus.NOT_FOUND,
  'FILE_NOT_FOUND',
) {}

export class InvalidPdfFileException extends GenCodedException(
  HttpStatus.BAD_REQUEST,
  'INVALID_PDF_FILE',
) {
  constructor(args: { fieldName: string }) {
    super('Invalid PDF', args);
  }
}
