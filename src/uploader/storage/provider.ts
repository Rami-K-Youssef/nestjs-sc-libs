import { Inject, Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { StorageFunction } from '.';
import { UploadModuleOptions } from '..';
import { UPLOAD_MODULE_OPTIONS } from '../consts';

import { generateLocalStorageFunc } from './local-storage';

@Injectable()
export class StorageProvider {
  constructor(
    @Inject(UPLOAD_MODULE_OPTIONS) private options: UploadModuleOptions,
  ) {}

  getStorageFunc(): StorageFunction {
    return generateLocalStorageFunc(
      this.options.localStorageOptions.storageDir ?? 'uploads',
      this.options.localStorageOptions.publicServePath,
    );
  }
}
