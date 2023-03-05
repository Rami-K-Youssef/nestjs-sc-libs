import {
  DynamicModule,
  Global,
  Inject,
  Module,
  ModuleMetadata,
  Provider,
} from "@nestjs/common";
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
import { ServeStaticModuleOptions } from "../serve-static";

enum DefaultLocEnum {}

export interface UploadModuleAsyncOptions {
  useFactory: (
    ...args: any[]
  ) => Promise<UploadModuleOptions> | UploadModuleOptions;
  inject?: any[];
}

@Module({
  imports: [],
  providers: [StorageProvider],
  exports: [StorageProvider],
})
@Global()
export class UploadModule {
  constructor(@Inject(UPLOAD_MODULE_OPTIONS) private readonly options) {}

  private static _localizeExceptions<
    T extends number | string = DefaultLocEnum
  >(localization?: Record<AllUploaderExceptions, Localization<T>>) {
    if (localization) initializeExceptions(localization);
    else
      initializeExceptions({
        [AllUploaderExceptions.FileMissingException]: {},
        [AllUploaderExceptions.FileNotFoundException]: {},
        [AllUploaderExceptions.ImageMissingAlphaChannelException]: {},
        [AllUploaderExceptions.InvalidAspectRatioException]: {},
        [AllUploaderExceptions.InvalidMimeTypeException]: {},
        [AllUploaderExceptions.InvalidPdfFileException]: {},
        [AllUploaderExceptions.BadFileException]: {},
      });
  }

  static forRoot<T extends number | string = DefaultLocEnum>(
    options: UploadModuleOptions,
    localization?: Record<AllUploaderExceptions, Localization<T>>
  ): DynamicModule {
    this._localizeExceptions(localization);
    const optionsProvider = {
      provide: UPLOAD_MODULE_OPTIONS,
      useValue: options,
    };
    return {
      module: UploadModule,
      imports: [this.initServeStaticModule(optionsProvider)],
      providers: [optionsProvider],
    };
  }

  onModuleInit() {
    if (this.options.storageType == UploadModuleStorageType.LOCAL) {
      if (!this.options.localStorageOptions)
        throw new Error("Local Storage Options are missing");
      if (!this.options.tempDirectory)
        this.options.tempDirectory = path.join(
          this.options?.localStorageOptions?.storageDir,
          "temp"
        );
    } else if (this.options.storageType == UploadModuleStorageType.AWS) {
      if (!this.options.tempDirectory) this.options.tempDirectory = "temp";
      if (!this.options.awsStorageOptions)
        throw new Error("AWS Storage Options are missing");
      const aws = this.options.awsStorageOptions;
      if (!aws.privateBucketName) aws.privateBucketName = aws.publicBucketName;
    } else throw new Error("not yet supported");
  }

  static forRootAsync<T extends number | string = DefaultLocEnum>(
    options: UploadModuleAsyncOptions,
    localization?: Record<AllUploaderExceptions, Localization<T>>
  ) {
    this._localizeExceptions(localization);
    const optionsProvider = {
      provide: UPLOAD_MODULE_OPTIONS,
      useFactory: options.useFactory,
      inject: options.inject,
    };
    return {
      module: UploadModule,
      imports: [this.initServeStaticModule(optionsProvider)],
      providers: [optionsProvider],
    };
  }

  private static initServeStaticModule(optionsProvider: Provider) {
    return ServeStaticModule.forRootAsync({
      imports: [],
      extraProviders: [optionsProvider],
      inject: [UPLOAD_MODULE_OPTIONS],
      useFactory: (options: UploadModuleOptions) =>
        options.localStorageOptions
          ? [
              (() => {
                const result: ServeStaticModuleOptions = {
                  serveRoot:
                    options.localStorageOptions.publicServePath.startsWith("/")
                      ? options.localStorageOptions.publicServePath
                      : "/" + options.localStorageOptions.publicServePath,
                  rootPath: path.join(
                    options.localStorageOptions.storageDir,
                    "public"
                  ),
                };
                if (options.localStorageOptions?.serveStaticOptions) {
                  result.serveStaticOptions =
                    options.localStorageOptions.serveStaticOptions;
                }
                return result;
              })(),
            ]
          : [],
    });
  }
}
