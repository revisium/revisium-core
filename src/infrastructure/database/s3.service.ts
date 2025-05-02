import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class S3Service {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    const S3_ENDPOINT = this.configService.get<string>('S3_ENDPOINT');
    const S3_REGION = this.configService.get<string>('S3_REGION');
    const S3_BUCKET = this.configService.get<string>('S3_BUCKET');
    const S3_ACCESS_KEY_ID = this.configService.get<string>('S3_ACCESS_KEY_ID');
    const S3_SECRET_ACCESS_KEY = this.configService.get<string>(
      'S3_SECRET_ACCESS_KEY',
    );

    if (!S3_ENDPOINT) {
      throw new Error(`Environment variable not found: S3_ENDPOINT`);
    }

    if (!S3_REGION) {
      throw new Error(`Environment variable not found: S3_REGION`);
    }

    if (!S3_BUCKET) {
      throw new Error(`Environment variable not found: S3_BUCKET`);
    }

    if (!S3_ACCESS_KEY_ID) {
      throw new Error(`Environment variable not found: S3_ACCESS_KEY_ID`);
    }

    if (!S3_SECRET_ACCESS_KEY) {
      throw new Error(`Environment variable not found: S3_SECRET_ACCESS_KEY`);
    }

    this.bucket = S3_BUCKET;

    console.log({
      region: S3_REGION,
      endpoint: S3_ENDPOINT,
      credentials: {
        accessKeyId: S3_ACCESS_KEY_ID,
        secretAccessKey: S3_SECRET_ACCESS_KEY,
      },
    });

    this.client = new S3Client({
      region: S3_REGION,
      endpoint: S3_ENDPOINT,
      credentials: {
        accessKeyId: S3_ACCESS_KEY_ID,
        secretAccessKey: S3_SECRET_ACCESS_KEY,
      },
    });
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
        }),
      );
      return { bucket: this.bucket, key: path };
    } catch (err) {
      console.error(err);
      throw new InternalServerErrorException(
        'Error uploading file to S3: ' + err.message + '',
      );
    }
  }
}
