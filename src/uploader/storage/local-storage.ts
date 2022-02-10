import { SingleFieldUploadOptions } from '..';
import { UploadedFile } from '../interfaces';

import * as path from 'path';
import * as fs from 'fs';
import { Readable } from 'stream';

export function generateLocalStorageFunc(
  storageDir: string,
  publicServePath: string,
) {
  return async function storeFileLocally(
    file: Express.Multer.File,
    name: string,
    stream: Readable,
    options: SingleFieldUploadOptions,
  ): Promise<UploadedFile> {
    return new Promise<UploadedFile>((resolve, reject) => {
      const finalDestination = path.join(
        storageDir,
        options.isPrivate ? 'private' : 'public',
        options.destination ?? '',
      );

      fs.mkdirSync(finalDestination, { recursive: true });
      const outStream = fs.createWriteStream(path.join(finalDestination, name));
      stream.pipe(outStream);
      outStream.on('error', reject);
      outStream.on('finish', () => {
        resolve(
          new UploadedFile({
            fieldName: file.fieldname,
            originalName: file.originalname,
            mimeType: file.mimetype,
            fileName: name,
            isPrivate: options.isPrivate,
            path: path.join(finalDestination, file.filename),
            url: options.isPrivate
              ? null
              : path.join(
                  publicServePath,
                  options.destination ?? '',
                  file.filename,
                ),
            size: outStream.bytesWritten,
            processedFiles: {} as Record<string, UploadedFile>,
            delete: function () {
              return new Promise<void>((resolve, reject) => {
                try {
                  if ((this as any).alreadyDeleted) {
                    console.log('THIS SHOULD NOT HAPPEN');
                    return;
                  }
                  (this as any).alreadyDeleted = true;
                  fs.unlinkSync(path.join(finalDestination, file.filename));
                  resolve();
                } catch (err) {
                  reject(err);
                }
              });
            },
          }),
        );
      });
    });
  };
}
