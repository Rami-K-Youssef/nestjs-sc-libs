import { PipelineAction } from ".";
import { SingleFieldUploadOptions } from "..";
import { UploadedFile } from "../interfaces";
import { StorageFunction } from "../storage";
import * as fs from "fs";
import * as path from "path";
import * as uuid from "uuid";
import { Readable } from "stream";
import { BaseStorageManager } from "../storage/storage-manager.base";

export class FilePipeline {
  protected _actions = [] as PipelineAction[];
  protected _mainFileAction: PipelineAction;
  protected _tempFilePath: string;
  protected _resultingFiles: UploadedFile[];
  protected _tempDirectory: string;

  protected options: SingleFieldUploadOptions;
  protected storageManager: BaseStorageManager;

  protected user?: any;

  public setOptions(
    options: SingleFieldUploadOptions,
    storageManager: BaseStorageManager,
    tempDirectory: string,
    user?: any
  ) {
    this.options = options;
    this.storageManager = storageManager;
    this.user = user;
    this._tempDirectory = tempDirectory;
  }

  protected async storeTemp(file: Partial<Express.Multer.File>) {
    return new Promise<void>((resolve, reject) => {
      const storagePath = this._tempDirectory;
      const filename = uuid.v4();
      this._tempFilePath = path.join(storagePath, filename);
      fs.mkdirSync(storagePath, { recursive: true });
      const writeStream = fs.createWriteStream(this._tempFilePath);
      file.stream.pipe(writeStream);
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    });
  }

  protected invokeAction(
    name: string,
    file: Partial<Express.Multer.File>,
    parentFile: UploadedFile | null,
    stream: Readable,
    storageManager: BaseStorageManager,
    action: PipelineAction
  ) {
    return action.method.call(
      this,
      name,
      file,
      parentFile,
      stream,
      storageManager,
      this.user,
      ...(action.args ?? [])
    );
  }

  public async runFile(
    file: Partial<Express.Multer.File>
  ): Promise<UploadedFile> {
    try {
      this._resultingFiles = [] as UploadedFile[];
      await this.storeTemp(file);
      if (!this._mainFileAction) this.persist();
      let flName = file.filename;
      const lastIndexOfDot = flName.lastIndexOf(".");
      const ext = this._mainFileAction.extension ?? "";
      if (lastIndexOfDot > 0 && ext) {
        flName = flName.substring(0, lastIndexOfDot);
      }
      const parentFile = await this.invokeAction(
        flName + ext,
        file,
        null,
        fs.createReadStream(this._tempFilePath),
        this.storageManager,
        this._mainFileAction
      );
      this._resultingFiles.push(parentFile);

      const lastDotIndex = file.filename.lastIndexOf(".");
      const fileName =
        lastDotIndex == -1
          ? file.filename
          : file.filename.substring(0, lastDotIndex);
      const fileExtension =
        lastDotIndex == -1 ? "" : file.filename.substring(lastDotIndex);

      for (const action of this._actions) {
        const filename =
          fileName + `-${action.name}` + (action.extension ?? fileExtension);
        const subFile = await this.invokeAction(
          filename,
          {},
          parentFile,
          action.skipStream ? null : fs.createReadStream(this._tempFilePath),
          this.storageManager,
          action
        );
        if (subFile) {
          parentFile.processedFiles ??= {} as Record<string, UploadedFile>;
          parentFile.processedFiles[action.name] = subFile;
          this._resultingFiles.push(subFile);
        }
      }

      return parentFile;
    } catch (err) {
      await Promise.allSettled(
        this._resultingFiles.map(async (resultingFile) => {
          await resultingFile.delete();
        })
      );
      throw err;
    } finally {
      this._cleanupTempFile().catch(console.error);
    }
  }

  private async _cleanupTempFile() {
    return new Promise<void>((resolve, reject) => {
      if (this._tempFilePath) {
        try {
          fs.unlinkSync(this._tempFilePath);
        } catch (err) {
          reject(err);
        }
      }
      resolve();
    });
  }

  public persist(name?: string): FilePipeline {
    if (!name) {
      this._mainFileAction = {
        method: persistFile,
        name: null,
      };
    } else {
      this._actions.push({
        method: persistFile,
        name,
      });
    }
    return this;
  }

  public clone(): FilePipeline {
    const newPipeline = new (<any>this.constructor)();
    newPipeline._mainFileAction = this._mainFileAction;
    newPipeline._tempDirectory = this._tempDirectory;
    newPipeline._actions = this._actions;
    newPipeline.storageManager = this.storageManager;
    newPipeline.options = this.options;
    newPipeline.user = this.user;
    return newPipeline;
  }
}

function persistFile(
  this: FilePipeline,
  name: string,
  file: Partial<Express.Multer.File>,
  $1: UploadedFile,
  stream: Readable,
  storageManager: BaseStorageManager,
  user?: any
) {
  return storageManager.getStorageFunc()(
    file,
    name,
    stream,
    this.options,
    user
  );
}
