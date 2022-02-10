import { Readable } from "stream";
import { FilePipeline, ImageValidationOptions } from ".";
import { UploadedFile } from "../interfaces";
import { StorageFunction } from "../storage/types";

import pdf from "pdf-parse";
import * as fs from "fs";
import { InvalidPdfFileException } from "../exceptions";

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
  file: Express.Multer.File,
  $2: Readable,
  $3: StorageFunction
): Promise<UploadedFile> {
  const data = fs.readFileSync(this._tempFilePath);
  try {
    await pdf(data);
  } catch {
    throw new InvalidPdfFileException({ fieldName: file.fieldname });
  }
  return null;
}
