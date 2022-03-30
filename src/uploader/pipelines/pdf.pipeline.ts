import { Readable } from "stream";
import { FilePipeline, ImageValidationOptions } from ".";
import { UploadedFile } from "../interfaces";
import { StorageFunction } from "../storage/types";

import pdf from "pdf-parse";
import * as fs from "fs";
import { BaseStorageManager } from "../storage/storage-manager.base";
import { instantiatePdfFileException } from "../exceptions";

export class PdfPipeline extends FilePipeline {
  persist(name?: string): PdfPipeline {
    return super.persist(name) as PdfPipeline;
  }

  validate(): PdfPipeline {
    this._actions.push({
      skipStream: true,
      name: null,
      method: validate,
    });
    return this;
  }
}

async function validate(
  this: PdfPipeline,
  $0: string,
  file: Partial<Express.Multer.File>,
  $1: UploadedFile | null,
  $2: Readable,
  $3: BaseStorageManager
): Promise<UploadedFile> {
  const data = fs.readFileSync(this._tempFilePath);
  try {
    await pdf(data);
  } catch {
    throw instantiatePdfFileException({ fieldName: file.fieldname });
  }
  return null;
}
