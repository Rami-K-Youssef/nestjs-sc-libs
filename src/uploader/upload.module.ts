import { DynamicModule, Global, Inject, Module } from '@nestjs/common';
import { UploadModuleOptions, UploadModuleStorageType } from '.';
import { UPLOAD_MODULE_OPTIONS } from './consts';
import { StorageProvider } from './storage/provider';
import { ServeStaticModule } from '@nestjs/serve-static';

import * as path from 'path';

@Module({
  imports: [],
  providers: [StorageProvider],
  exports: [StorageProvider],
})
@Global()
export class UploadModule {
  constructor(@Inject(UPLOAD_MODULE_OPTIONS) private readonly options) {}

  static forRoot(options: UploadModuleOptions): DynamicModule {
    if (options.storageType == UploadModuleStorageType.LOCAL) {
      if (!options.localStorageOptions)
        throw new Error('Local Storage Options are missing');
      return {
        module: UploadModule,
        imports: [
          ServeStaticModule.forRoot({
            serveRoot: options.localStorageOptions.publicServePath.startsWith(
              '/',
            )
              ? options.localStorageOptions.publicServePath
              : '/' + options.localStorageOptions.publicServePath,
            rootPath: path.join(
              options.localStorageOptions.storageDir,
              'public',
            ),
          }),
        ],
        providers: [
          {
            provide: UPLOAD_MODULE_OPTIONS,
            useValue: options,
          },
        ],
      };
    } else throw new Error('AWS not yet supported');
  }
}
