import { Inject, Injectable } from "@nestjs/common";
import { LocalStorageManager } from ".";
import { UploadModuleOptions } from "..";
import { UPLOAD_MODULE_OPTIONS } from "../consts";
import { Response } from "express";

import { BaseStorageManager, DownloadableFile } from "./storage-manager.base";
import { UploadModuleStorageType } from "../interfaces";
import { AwsStorageManager } from "./aws-storage";

@Injectable()
export class StorageProvider {
  private readonly storageManager: BaseStorageManager;
  private param: any;

  constructor(
    @Inject(UPLOAD_MODULE_OPTIONS) private options: UploadModuleOptions
  ) {
    switch (options.storageType) {
      case UploadModuleStorageType.LOCAL:
        this.storageManager = new LocalStorageManager(options);
        break;
      case UploadModuleStorageType.AWS:
        this.storageManager = new AwsStorageManager(options);
        break;
      default:
        throw new Error("storage type not supported");
    }
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

  async pipeFile(res: Response, file: DownloadableFile, inline = false) {
    const name = file.overrideName ?? file.originalName ?? "file";
    if (!inline)
      res.setHeader(
        "content-disposition",
        `attachment; filename=${encodeURI(name)}`
      );
    else res.setHeader("content-disposition", "inline");
    await this.storageManager.pipeFile(file, res);
  }

  async zipAndPipeFiles(
    res: Response,
    name: string,
    files: Array<DownloadableFile>,
    inline = false
  ) {
    if (!inline)
      res.setHeader(
        "content-disposition",
        `attachment; filename=${encodeURI(name)}`
      );
    else res.setHeader("content-disposition", "inline");
    await this.storageManager.zipMultipleFiles(files, res);
  }
}
