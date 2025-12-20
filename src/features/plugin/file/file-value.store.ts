import { extname } from 'node:path';
import sharp from 'sharp';
import hash from 'object-hash';
import { FileStatus } from 'src/features/plugin/file/consts';
import {
  JsonNumberValueStore,
  JsonObjectValueStore,
  JsonStringValueStore,
} from '@revisium/schema-toolkit/model';

export enum FileValueKeys {
  status = 'status',
  fileId = 'fileId',
  url = 'url',
  fileName = 'fileName',
  hash = 'hash',
  extension = 'extension',
  mimeType = 'mimeType',
  size = 'size',
  width = 'width',
  height = 'height',
}

export const IMAGE_MIME_TYPE = 'image/';

export class FileValueStore {
  constructor(private readonly store: JsonObjectValueStore) {}

  public async uploadFile(file: Express.Multer.File) {
    this.status = FileStatus.uploaded;
    this.fileName = file.originalname;
    this.hash = hash(file.buffer);
    this.mimeType = file.mimetype;
    this.size = file.size;
    this.extension = extname(file.originalname).slice(1);

    this.width = 0;
    this.height = 0;

    if (this.mimeType.startsWith(IMAGE_MIME_TYPE)) {
      const metadata = await sharp(file.buffer).metadata();
      this.width = metadata.width ?? 0;
      this.height = metadata.height ?? 0;
    }
  }

  public ensureDefaults(): void {
    for (const [field, item] of Object.entries(this.store.value)) {
      if (item.value !== item.schema.default) {
        throw new Error(
          `${field} must have default value = ${JSON.stringify(item.schema.default)}`,
        );
      }
    }
  }

  public checkImmutable(previous: FileValueStore): void {
    for (const [field, item] of Object.entries(this.store.value)) {
      if (field !== FileValueKeys.fileName && field !== FileValueKeys.url) {
        const prevVal = (previous.store.value[field] as JsonStringValueStore)
          .value;
        if (item.value !== prevVal) {
          throw new Error(`${field} must have value = ${prevVal}`);
        }
      }
    }
  }

  public get status(): FileStatus {
    return this.getString(FileValueKeys.status) as FileStatus;
  }
  public set status(value: FileStatus) {
    this.setString(FileValueKeys.status, value);
  }

  public get fileId(): string {
    return this.getString(FileValueKeys.fileId);
  }
  public set fileId(value: string) {
    this.setString(FileValueKeys.fileId, value);
  }

  public get url(): string {
    return this.getString(FileValueKeys.url);
  }
  public set url(value: string) {
    this.setString(FileValueKeys.url, value);
  }

  public get fileName(): string {
    return this.getString(FileValueKeys.fileName);
  }
  public set fileName(value: string) {
    this.setString(FileValueKeys.fileName, value);
  }

  public get hash(): string {
    return this.getString(FileValueKeys.hash);
  }
  public set hash(value: string) {
    this.setString(FileValueKeys.hash, value);
  }

  public get extension(): string {
    return this.getString(FileValueKeys.extension);
  }
  public set extension(value: string) {
    this.setString(FileValueKeys.extension, value);
  }

  public get mimeType(): string {
    return this.getString(FileValueKeys.mimeType);
  }
  public set mimeType(value: string) {
    this.setString(FileValueKeys.mimeType, value);
  }

  public get size(): number {
    return this.getNumber(FileValueKeys.size);
  }
  public set size(value: number) {
    this.setNumber(FileValueKeys.size, value);
  }

  public get width(): number {
    return this.getNumber(FileValueKeys.width);
  }
  public set width(value: number) {
    this.setNumber(FileValueKeys.width, value);
  }

  public get height(): number {
    return this.getNumber(FileValueKeys.height);
  }
  public set height(value: number) {
    this.setNumber(FileValueKeys.height, value);
  }

  private getString(key: FileValueKeys): string {
    return (this.store.value[key] as JsonStringValueStore).getPlainValue();
  }
  private setString(key: FileValueKeys, value: string): void {
    (this.store.value[key] as JsonStringValueStore).value = value;
  }
  private getNumber(key: FileValueKeys): number {
    return (this.store.value[key] as JsonNumberValueStore).getPlainValue();
  }
  private setNumber(key: FileValueKeys, value: number): void {
    (this.store.value[key] as JsonNumberValueStore).value = value;
  }
}
