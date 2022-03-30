import { Inject, Injectable } from "@nestjs/common";
import { LocalStorageManager, StorageFunction } from ".";
import { UploadedFile, UploadModuleOptions } from "..";
import { UPLOAD_MODULE_OPTIONS } from "../consts";
import { Response } from "express";

import * as fs from "fs";

import archiver from "archiver";
import { BaseStorageManager } from "./storage-manager.base";
import { instantiateFileNotFoundException } from "../exceptions";

type File = {
  originalName?: string;
  overrideName?: string;
  path?: string;
  url?: string;
};

@Injectable()
export class StorageProvider {
  private readonly storageManager: BaseStorageManager;
  private param: any;

  constructor(
    @Inject(UPLOAD_MODULE_OPTIONS) private options: UploadModuleOptions
  ) {
    // TODO: Make it according to upload type (local/public)
    this.storageManager = new LocalStorageManager(options);
  }

  getOnSuccessParam() {
    return this.param;
  }
  setOnSuccessParam(param: any) {
    this.param = param;
  }

  getStorageManager() {
    return this.storageManager;
  }

  getTempDirectory() {
    return this.options.tempDirectory;
  }

  pipePrivateFile(res: Response, file: File, inline = false) {
    const name = file.overrideName ?? file.originalName ?? "file";
    if (file.url) {
      // online
    } else {
      if (!fs.existsSync(file.path)) throw instantiateFileNotFoundException();
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
