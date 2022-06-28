import { HttpStatus } from "@nestjs/common";
import e from "express";
import {
  CodedException,
  GenCodedException,
} from "./../backend-helpers/exceptions";
import { AllUploaderExceptions, Localization } from "./types";

export function initializeExceptions<T extends number | string>(
  localization: Record<AllUploaderExceptions, Localization<T>>
) {
  class InternalImageMissingAlphaChannelException extends GenCodedException<T>(
    HttpStatus.BAD_REQUEST,
    "ALPHA_CHANNEL_MISSING",
    localization[AllUploaderExceptions.ImageMissingAlphaChannelException]
  ) {}
  //@ts-ignore
  ImageMissingAlphaChannelException = InternalImageMissingAlphaChannelException;

  class InternalBadFileException extends GenCodedException<T>(
    HttpStatus.BAD_REQUEST,
    "BAD_FILE",
    localization[AllUploaderExceptions.BadFileException]
  ) {}
  //@ts-ignore
  BadFileException = InternalBadFileException;

  class InternalFileNotFoundException extends GenCodedException(
    HttpStatus.NOT_FOUND,
    "FILE_NOT_FOUND",
    localization[AllUploaderExceptions.FileNotFoundException]
  ) {}
  //@ts-ignore
  FileNotFoundException = InternalFileNotFoundException;

  class InternalInvalidPdfFileException extends GenCodedException(
    HttpStatus.BAD_REQUEST,
    "INVALID_PDF_FILE",
    localization[AllUploaderExceptions.InvalidPdfFileException]
  ) {
    constructor(args: { fieldName: string }) {
      super(undefined, args);
    }
  }
  //@ts-ignore
  InvalidPdfFileException = InternalInvalidPdfFileException;

  class InternalFileMissingException extends GenCodedException(
    HttpStatus.BAD_REQUEST,
    "FILE_REQUIRED",
    localization[AllUploaderExceptions.FileMissingException]
  ) {
    constructor(args: { fieldName: string }) {
      super(undefined, args);
    }
  }
  //@ts-ignore
  FileMissingException = InternalFileMissingException;

  class InternalInvalidMimeTypeException extends GenCodedException(
    HttpStatus.BAD_REQUEST,
    "MIME_TYPE_INVALID",
    localization[AllUploaderExceptions.InvalidMimeTypeException]
  ) {
    constructor(args: any) {
      super(undefined, args);
    }
  }
  //@ts-ignore
  InvalidMimeTypeException = InternalInvalidMimeTypeException;

  class InternalInvalidAspectRatioException extends GenCodedException(
    HttpStatus.BAD_REQUEST,
    "ASPECT_RATIO_INVALID",
    localization[AllUploaderExceptions.InvalidAspectRatioException]
  ) {
    constructor(args) {
      super(undefined, args);
    }
  }
  //@ts-ignore
  InvalidAspectRatioException = InternalInvalidAspectRatioException;
}

type InvalidAspectRatioExceptionConstructor = new (args: {
  min: number;
  max: number;
  received: number;
  fieldName: string;
  originalName: string;
}) => CodedException<any>;
let InvalidAspectRatioException: InvalidAspectRatioExceptionConstructor;
export function instantiateInvalidAspectRatioException(args: {
  min: number;
  max: number;
  received: number;
  fieldName: string;
  originalName: string;
}) {
  return new InvalidAspectRatioException(args);
}

type BadFileExceptionConstructor = new () => CodedException<any>;
let BadFileException: BadFileExceptionConstructor;
export function instantiateBadFileException() {
  return new BadFileException();
}

type ImageMissingAlphaChannelExceptionConstructor =
  new () => CodedException<any>;
let ImageMissingAlphaChannelException: ImageMissingAlphaChannelExceptionConstructor;
export function instantiateImageMissingAlphaChannelException() {
  return new ImageMissingAlphaChannelException();
}

type InvalidMimeTypeExceptionConstructor = new (args: {
  mimeType: string;
  allowedTypes: RegExp[];
  fieldName: string;
  originalName: string;
}) => CodedException<any>;
let InvalidMimeTypeException: InvalidMimeTypeExceptionConstructor;
export function instantiateInvalidMimeTypeException(args: {
  mimeType: string;
  allowedTypes: RegExp[];
  fieldName: string;
  originalName: string;
}) {
  return new InvalidMimeTypeException(args);
}

type FileMissingExceptionConstructor = new (args: {
  fieldName: string;
}) => CodedException<any>;
let FileMissingException: FileMissingExceptionConstructor;
export function instantiateFileMissingException(args: { fieldName: string }) {
  return new FileMissingException(args);
}

type FileNotFoundExceptionConstructor = new () => CodedException<any>;
let FileNotFoundException: FileNotFoundExceptionConstructor;
export function instantiateFileNotFoundException() {
  return new FileNotFoundException();
}

type InvalidPdfFileExceptionConstructor = new (args: {
  fieldName: string;
}) => CodedException<any>;
let InvalidPdfFileException: InvalidPdfFileExceptionConstructor;
export function instantiatePdfFileException(args: { fieldName: string }) {
  return new InvalidPdfFileException(args);
}
