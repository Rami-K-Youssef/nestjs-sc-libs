import { PipelineAction } from ".";
import { SingleFieldUploadOptions } from "..";
import { UploadedFile } from "../interfaces";
import { StorageFunction } from "../storage";
import * as fs from "fs";
import * as path from "path";
import * as uuid from "uuid";
import { Readable } from "stream";

export class FilePipeline {
  protected _actions = [] as PipelineAction[];
  protected _mainFileAction: PipelineAction;
  protected _tempFilePath: string;
  protected _resultingFiles: UploadedFile[];

  protected options: SingleFieldUploadOptions;
  protected storageCallback: StorageFunction;

  public setOptions(
    options: SingleFieldUploadOptions,
    storageCallback: StorageFunction
  ) {
    this.options = options;
    this.storageCallback = storageCallback;
  }

  protected async storeTemp(file: Express.Multer.File) {
    return new Promise<void>((resolve, reject) => {
      const storagePath = "temp"; //should be configurable
      const filename = uuid.v4();
      this._tempFilePath = path.join(storagePath, filename);
      const writeStream = fs.createWriteStream(this._tempFilePath);
      file.stream.pipe(writeStream);
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    });
  }

  protected invokeAction(
    name: string,
    file: Express.Multer.File,
    stream: Readable,
    storageCallback: StorageFunction,
    action: PipelineAction
  ) {
    return action.method.call(
      this,
      name,
      file,
      stream,
      storageCallback,
      ...(action.args ?? [])
    );
  }

  public async runFile(file: Express.Multer.File): Promise<UploadedFile> {
    try {
      await this.storeTemp(file);
      this._resultingFiles = [] as UploadedFile[];
      if (!this._mainFileAction) this.persist();
      const result = await this.invokeAction(
        file.filename,
        file,
        fs.createReadStream(this._tempFilePath),
        this.storageCallback,
        this._mainFileAction
      );
      this._resultingFiles.push(result);

      const lastDotIndex = file.filename.lastIndexOf(".");
      const fileName = file.filename.substring(0, lastDotIndex);
      const fileExtension =
        lastDotIndex == -1 ? "" : file.filename.substring(lastDotIndex);

      for (const action of this._actions) {
        const filename = fileName + `-${action.name}` + fileExtension;
        const subFile = await this.invokeAction(
          filename,
          file,
          action.skipStream ? null : fs.createReadStream(this._tempFilePath),
          this.storageCallback,
          action
        );
        if (subFile) {
          result.processedFiles[action.name] = subFile;
          this._resultingFiles.push(subFile);
        }
      }

      return result;
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
    newPipeline._actions = this._actions;
    newPipeline.storageCallback = this.storageCallback;
    newPipeline.options = this.options;
    return newPipeline;
  }
}

function persistFile(
  this: FilePipeline,
  name: string,
  file: Express.Multer.File,
  stream: Readable,
  storageCallback: StorageFunction
) {
  return storageCallback(file, name, stream, this.options);
}
