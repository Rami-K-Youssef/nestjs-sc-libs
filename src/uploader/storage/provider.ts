import { Inject, Injectable } from "@nestjs/common";
import { StorageFunction } from ".";
import { UploadedFile, UploadModuleOptions } from "..";
import { UPLOAD_MODULE_OPTIONS } from "../consts";
import { Response } from "express";
import { generateLocalStorageFunc } from "./local-storage";

import * as fs from "fs";
import { FileNotFoundException } from "../exceptions";

import * as archiver from "archiver";

type File = {
  originalName?: string;
  path?: string;
  url?: string;
};

@Injectable()
export class StorageProvider {
  constructor(
    @Inject(UPLOAD_MODULE_OPTIONS) private options: UploadModuleOptions
  ) {}

  getStorageFunc(): StorageFunction {
    return generateLocalStorageFunc(
      this.options.localStorageOptions.storageDir ?? "uploads",
      this.options.localStorageOptions.publicServePath
    );
  }

  pipePrivateFile(res: Response, file: File) {
    const name = file.originalName ?? "file";
    if (file.url) {
      // online
    } else {
      if (!fs.existsSync(file.path)) throw new FileNotFoundException();
      fs.createReadStream(file.path).pipe(res);
    }
    res.setHeader("content-disposition", `attachment; filename=${name}`);
  }

  async zipPrivateFiles(res: Response, name: string, files: Array<File>) {
    const archive = archiver("zip");
    return new Promise((resolve, reject) => {
      archive.on("error", function (err) {
        reject(err);
      });

      files.forEach((fl) => {
        if (fl.url) {
          // online
        } else {
          if (fs.existsSync(fl.path)) {
            archive.file(fl.path, { name: fl.originalName });
          }
        }
      });

      archive.pipe(res);
      archive.finalize();
      archive.on("close", resolve);
      res.setHeader("content-disposition", `attachment; filename=${name}`);
    });
  }
}
