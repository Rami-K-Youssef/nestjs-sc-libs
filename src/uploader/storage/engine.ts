import { Request } from 'express';
import multer from 'multer';
import { CustomStorageOptions } from './types';

import * as uuid from 'uuid';
import * as path from 'path';
import { FilePipeline, RequestWithUploadedFiles } from '..';
import { StorageProvider } from './provider';

function getFileName(req, file, cb) {
  cb(null, file.fieldname + '-' + uuid.v4() + path.extname(file.originalname));
}

class CustomStorageEngine implements multer.StorageEngine {
  private opts: CustomStorageOptions;

  constructor(
    opts: CustomStorageOptions,
    private readonly storageProvider: StorageProvider,
  ) {
    this.opts = opts;
  }

  _handleFile(
    req: RequestWithUploadedFiles,
    file: Express.Multer.File,
    cb: (error?: any, info?: Partial<Express.Multer.File>) => void,
  ) {
    getFileName(req, file, (err, filename) => {
      if (err) return cb(err);
      file.filename = filename;
      const options = this.opts.fileDescriptors[file.fieldname];
      const pipeline = options.pipeline?.clone() ?? new FilePipeline();
      const storageFunc = this.storageProvider.getStorageFunc();
      pipeline.setOptions(options, storageFunc);
      // make it read from module properties later
      pipeline
        .runFile(file)
        .then((uploadedFile) => {
          // store file on request
          const fieldStorage = req.uploadedFiles[file.fieldname] ?? [];
          fieldStorage.push(uploadedFile);
          req.uploadedFiles[file.fieldname] = fieldStorage;
          cb(null, file);
        })
        .catch(cb);
    });
  }

  _removeFile(
    req: Request,
    file: Express.Multer.File,
    callback: (error: Error) => void,
  ): void {
    console.log('removing ', file);
    callback(null);
  }
}

export function generateStorageEngine(
  opts: CustomStorageOptions,
  storageProvider: StorageProvider,
) {
  return new CustomStorageEngine(opts, storageProvider);
}
