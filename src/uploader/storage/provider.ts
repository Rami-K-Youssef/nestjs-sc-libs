import { Inject, Injectable } from "@nestjs/common";
import { StorageFunction } from ".";
import { UploadedFile, UploadModuleOptions } from "..";
import { UPLOAD_MODULE_OPTIONS } from "../consts";
import { Response } from "express";
import { generateLocalStorageFunc } from "./local-storage";

import * as fs from "fs";
import { FileNotFoundException } from "../exceptions";

import archiver from "archiver";

type File = {
  originalName?: string;
  overrideName?: string;
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

  getTempDirectory() {
    return this.options.tempDirectory;
  }

  pipePrivateFile(res: Response, file: File, inline = false) {
    const name = file.overrideName ?? file.originalName ?? "file";
    if (file.url) {
      // online
    } else {
      if (!fs.existsSync(file.path)) throw new FileNotFoundException();
      fs.createReadStream(file.path).pipe(res);
    }
    if (!inline)
      res.setHeader("content-disposition", `attachment; filename=${name}`);
    else res.setHeader("content-disposition", "inline");
  }

  async zipPrivateFiles(
    res: Response,
    name: string,
    files: Array<File>,
    inline = false
  ) {
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
            archive.file(fl.path, { name: fl.overrideName ?? fl.originalName });
          }
        }
      });

      archive.pipe(res);
      archive.finalize();
      archive.on("close", resolve);
      if (!inline)
        res.setHeader("content-disposition", `attachment; filename=${name}`);
      else res.setHeader("content-disposition", "inline");
    });
  }
}
