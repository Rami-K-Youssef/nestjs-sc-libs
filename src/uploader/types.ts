export enum AllUploaderExceptions {
  InvalidAspectRatioException,
  ImageMissingAlphaChannelException,
  InvalidMimeTypeException,
  FileMissingException,
  FileNotFoundException,
  InvalidPdfFileException,
}

export type Localization<T extends string | number> = Record<
  T,
  string | ((args: any) => string)
>;
