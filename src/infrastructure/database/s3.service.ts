import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);

  private readonly _client: S3Client | null = null;
  private readonly _bucket: string | null = null;

  constructor(private readonly configService: ConfigService) {
    const S3_ENDPOINT = this.configService.get<string>('S3_ENDPOINT');
    const S3_REGION = this.configService.get<string>('S3_REGION');
    const S3_BUCKET = this.configService.get<string>('S3_BUCKET');
    const S3_ACCESS_KEY_ID = this.configService.get<string>('S3_ACCESS_KEY_ID');
    const S3_SECRET_ACCESS_KEY = this.configService.get<string>(
      'S3_SECRET_ACCESS_KEY',
    );

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

  public async uploadFile(
    file: Express.Multer.File,
    path: string,
  ): Promise<{ bucket: string; key: string }> {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: path,
          Body: file.buffer,
          ContentType: file.mimetype,
          ContentLength: file.size,
          ACL: 'public-read',
        }),
      );

      this.logger.log(`File uploaded to S3: ${path}, bucket: ${this.bucket}`);

      return { bucket: this.bucket, key: path };
    } catch (err) {
      this.logger.error(
        `Error uploading file to S3: path=${path} ${err.message}`,
      );

      throw new InternalServerErrorException(
        'Error uploading file to S3: ' + err.message + '',
      );
    }
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
