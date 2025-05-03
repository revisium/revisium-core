import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { S3Service } from '../s3.service';

const s3Mock = mockClient(S3Client);

describe('S3Service', () => {
  it('should set client and bucket when config provided', () => {
    expect(s3Service.isAvailable).toBe(true);
  });

  it('should return false if missing configuration', () => {
    const badConfig = {
      get: jest.fn().mockReturnValue(null),
    } as unknown as ConfigService;

    const service = new S3Service(badConfig);

    expect(service.isAvailable).toBe(false);
  });

  describe('uploadFile', () => {
    it('should upload file and return bucket and key on success', async () => {
      const result = await s3Service.uploadFile(file, key);

      const calls = s3Mock.commandCalls(PutObjectCommand);
      expect(calls).toHaveLength(1);
      expect(calls[0].args[0].input).toEqual({
        Bucket: TEST_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ContentLength: file.size,
        ACL: 'public-read',
      });

      expect(result).toEqual({ bucket: TEST_BUCKET, key });
    });

    it('should throw InternalServerErrorException on failure', async () => {
      s3Mock.on(PutObjectCommand).rejects(new Error('network failure'));

      await expect(s3Service.uploadFile(file, key)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    const file: Express.Multer.File = {
      buffer: Buffer.from('data'),
      mimetype: 'text/plain',
      size: 4,
      fieldname: '',
      originalname: '',
      encoding: '',
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };
    const key = 'path/to/file.txt';
  });

  let s3Service: S3Service;
  let configService: Partial<ConfigService>;
  const TEST_BUCKET = 'test-bucket';
  const TEST_REGION = 'test-region';
  const TEST_ENDPOINT = 'https://test.endpoint';
  const TEST_KEY = 'AKIA_TEST';
  const TEST_SECRET = 'SECRET_TEST';

  beforeEach(() => {
    s3Mock.reset();

    s3Mock.on(PutObjectCommand).resolves({});

    configService = {
      get: jest.fn((key: string) => {
        switch (key) {
          case 'S3_ENDPOINT':
            return TEST_ENDPOINT;
          case 'S3_REGION':
            return TEST_REGION;
          case 'S3_BUCKET':
            return TEST_BUCKET;
          case 'S3_ACCESS_KEY_ID':
            return TEST_KEY;
          case 'S3_SECRET_ACCESS_KEY':
            return TEST_SECRET;
          default:
            return null;
        }
      }),
    };

    s3Service = new S3Service(configService as ConfigService);
  });
});
