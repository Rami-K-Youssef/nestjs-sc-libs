import { Inject, Injectable } from '@nestjs/common';
import { StorageFunction } from '.';
import { UploadModuleOptions } from '..';
import { UPLOAD_MODULE_OPTIONS } from '../consts';
import { Response } from 'express';
import { generateLocalStorageFunc } from './local-storage';

import * as fs from 'fs';
import { FileNotFoundException } from '../exceptions';

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

  pipePrivateFile(
    res: Response,
    file: { url?: string; path: string; name?: string },
  ) {
    const name = file.name ?? 'file';
    if (file.url) {
      // online
    } else {
      if (!fs.existsSync(file.path)) throw new FileNotFoundException();
      fs.createReadStream(file.path).pipe(res);
    }
  }
}
