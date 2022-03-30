import { DynamicModule, Global, Inject, Module } from "@nestjs/common";
import {
  AllUploaderExceptions,
  Localization,
  UploadModuleOptions,
  UploadModuleStorageType,
} from ".";
import { UPLOAD_MODULE_OPTIONS } from "./consts";
import { StorageProvider } from "./storage/provider";
import { ServeStaticModule } from "./../serve-static/serve-static.module";

import * as path from "path";
import { initializeExceptions } from "./exceptions";

enum DefaultLocEnum {}

@Module({
  imports: [],
  providers: [StorageProvider],
  exports: [StorageProvider],
})
@Global()
export class UploadModule {
  constructor(@Inject(UPLOAD_MODULE_OPTIONS) private readonly options) {}

  static forRoot<T extends number | string = DefaultLocEnum>(
    options: UploadModuleOptions,
    localization?: Record<AllUploaderExceptions, Localization<T>>
  ): DynamicModule {
    if (localization) initializeExceptions(localization);
    else
      initializeExceptions({
        [AllUploaderExceptions.FileMissingException]: {},
        [AllUploaderExceptions.FileNotFoundException]: {},
        [AllUploaderExceptions.ImageMissingAlphaChannelException]: {},
        [AllUploaderExceptions.InvalidAspectRatioException]: {},
        [AllUploaderExceptions.InvalidMimeTypeException]: {},
        [AllUploaderExceptions.InvalidPdfFileException]: {},
      });
    if (options.storageType == UploadModuleStorageType.LOCAL) {
      if (!options.localStorageOptions)
        throw new Error("Local Storage Options are missing");
      if (!options.tempDirectory)
        options.tempDirectory = path.join(
          options.localStorageOptions.storageDir,
          "temp"
        );
      const providers = [
        {
          provide: UPLOAD_MODULE_OPTIONS,
          useValue: options,
        },
      ] as any[];

      return {
        module: UploadModule,
        imports: [
          ServeStaticModule.forRoot({
            serveRoot: options.localStorageOptions.publicServePath.startsWith(
              "/"
            )
              ? options.localStorageOptions.publicServePath
              : "/" + options.localStorageOptions.publicServePath,
            rootPath: path.join(
              options.localStorageOptions.storageDir,
              "public"
            ),
          }),
        ],
        providers,
      };
    } else throw new Error("AWS not yet supported");
  }
}
