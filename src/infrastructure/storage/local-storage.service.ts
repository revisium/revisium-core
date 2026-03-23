import { existsSync, mkdirSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, isAbsolute, resolve } from 'node:path';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IStorageService } from 'src/infrastructure/storage/storage.interface';

@Injectable()
export class LocalStorageService implements IStorageService {
  private readonly logger = new Logger(LocalStorageService.name);

  private readonly storagePath: string;
  private readonly publicEndpoint: string;

  constructor(private readonly configService: ConfigService) {
    const localPath =
      this.configService.get<string>('STORAGE_LOCAL_PATH') ?? './uploads';
    this.storagePath = resolve(localPath);

    const explicitEndpoint = this.configService.get<string>(
      'FILE_PLUGIN_PUBLIC_ENDPOINT',
    );
    if (explicitEndpoint) {
      this.publicEndpoint = explicitEndpoint;
    } else {
      const port = this.configService.get<string>('PORT') ?? '8080';
      this.publicEndpoint = `http://localhost:${port}/files`;
    }

    this.ensureDirectory();
  }

  public get isAvailable(): boolean {
    return true;
  }

  public get canServeFiles(): boolean {
    return true;
  }

  public async uploadFile(
    file: Express.Multer.File,
    path: string,
  ): Promise<{ key: string }> {
    try {
      const filePath = this.resolveFilePath(path);
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, file.buffer);
      await writeFile(`${filePath}.meta`, file.mimetype);

      this.logger.log(
        `File uploaded to local storage: ${path}, dir: ${this.storagePath}`,
      );

      return { key: path };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Error uploading file to local storage: path=${path} ${errorMessage}`,
      );

      throw new InternalServerErrorException(
        `Error uploading file to local storage: ${errorMessage}`,
      );
    }
  }

  public getPublicUrl(key: string): string {
    const encodedKey = key
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
    return `${this.publicEndpoint}/${encodedKey}`;
  }

  public getStoragePath(): string {
    return this.storagePath;
  }

  public async readFile(
    key: string,
  ): Promise<{ buffer: Buffer; contentType: string } | null> {
    const filePath = this.resolveFilePath(key);

    try {
      const buffer = await readFile(filePath);
      const metaPath = `${filePath}.meta`;
      let contentType = 'application/octet-stream';
      try {
        contentType = await readFile(metaPath, 'utf-8');
      } catch {
        // meta file missing — use default
      }

      return { buffer, contentType };
    } catch {
      return null;
    }
  }

  private resolveFilePath(key: string): string {
    const resolved = resolve(this.storagePath, key);
    const rel = relative(this.storagePath, resolved);
    if (rel.startsWith('..') || isAbsolute(rel)) {
      throw new InternalServerErrorException('Invalid file path');
    }
    return resolved;
  }

  private ensureDirectory(): void {
    if (!existsSync(this.storagePath)) {
      mkdirSync(this.storagePath, { recursive: true });
    }
  }
}
