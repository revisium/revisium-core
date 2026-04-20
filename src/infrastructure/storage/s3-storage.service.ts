import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IStorageService } from 'src/infrastructure/storage/storage.interface';

@Injectable()
export class S3StorageService implements IStorageService {
  private readonly logger = new Logger(S3StorageService.name);

  private readonly _client: S3Client | null = null;
  private readonly _bucket: string | null = null;
  private readonly _publicEndpoint: string;

  constructor(private readonly configService: ConfigService) {
    const S3_ENDPOINT = this.configService.get<string>('S3_ENDPOINT');
    const S3_REGION = this.configService.get<string>('S3_REGION');
    const S3_BUCKET = this.configService.get<string>('S3_BUCKET');
    const S3_ACCESS_KEY_ID = this.configService.get<string>('S3_ACCESS_KEY_ID');
    const S3_SECRET_ACCESS_KEY = this.configService.get<string>(
      'S3_SECRET_ACCESS_KEY',
    );

    this._publicEndpoint =
      this.configService.get<string>('FILE_PLUGIN_PUBLIC_ENDPOINT') ?? '';

    if (S3_BUCKET) {
      this._bucket = S3_BUCKET;
    }

    if (S3_REGION && S3_ENDPOINT && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY) {
      this._client = new S3Client({
        region: S3_REGION,
        endpoint: S3_ENDPOINT,
        credentials: {
          accessKeyId: S3_ACCESS_KEY_ID,
          secretAccessKey: S3_SECRET_ACCESS_KEY,
        },
      });
    }
  }

  public get isAvailable(): boolean {
    return Boolean(this._client && this._bucket);
  }

  public get canServeFiles(): boolean {
    return false;
  }

  public async uploadFile(
    file: Express.Multer.File,
    path: string,
  ): Promise<{ key: string }> {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: path,
          Body: file.buffer,
          ContentType: file.mimetype,
          ContentLength: file.size,
          CacheControl: 'public, max-age=31536000, immutable',
          ACL: 'public-read',
        }),
      );

      this.logger.log(`File uploaded to S3: ${path}, bucket: ${this.bucket}`);

      return { key: path };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Error uploading file to S3: path=${path} ${errorMessage}`,
      );

      throw new InternalServerErrorException(
        `Error uploading file to S3: ${errorMessage}`,
      );
    }
  }

  public async deleteFile(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      this.logger.log(`File deleted from S3: ${key}, bucket: ${this.bucket}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Error deleting file from S3: key=${key} ${errorMessage}`,
      );
      throw new InternalServerErrorException(
        `Error deleting file from S3: ${errorMessage}`,
      );
    }
  }

  public getPublicUrl(key: string): string {
    if (!this._publicEndpoint) {
      throw new InternalServerErrorException(
        'FILE_PLUGIN_PUBLIC_ENDPOINT is not configured',
      );
    }
    return encodeURI(`${this._publicEndpoint}/${key}`);
  }

  private get client(): S3Client {
    if (!this._client) {
      throw new InternalServerErrorException('Invalid S3 client');
    }
    return this._client;
  }

  private get bucket() {
    if (!this._bucket) {
      throw new InternalServerErrorException('Invalid S3 bucket');
    }
    return this._bucket;
  }
}
