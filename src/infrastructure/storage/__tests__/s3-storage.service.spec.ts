import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { S3StorageService } from '../s3-storage.service';

const s3Mock = mockClient(S3Client);

describe('S3StorageService', () => {
  it('should be available when config provided', () => {
    expect(service.isAvailable).toBe(true);
  });

  it('should return false if missing configuration', () => {
    const badConfig = {
      get: jest.fn().mockReturnValue(null),
    } as unknown as ConfigService;

    const svc = new S3StorageService(badConfig);
    expect(svc.isAvailable).toBe(false);
  });

  describe('uploadFile', () => {
    it('should upload file and return key on success', async () => {
      const result = await service.uploadFile(file, key);

      const calls = s3Mock.commandCalls(PutObjectCommand);
      expect(calls).toHaveLength(1);
      expect(calls[0].args[0].input).toEqual({
        Bucket: TEST_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ContentLength: file.size,
        CacheControl: 'public, max-age=31536000, immutable',
        ACL: 'public-read',
      });

      expect(result).toEqual({ key });
    });

    it('should throw InternalServerErrorException on failure', async () => {
      s3Mock.on(PutObjectCommand).rejects(new Error('network failure'));

      await expect(service.uploadFile(file, key)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('deleteFile', () => {
    it('sends a DeleteObjectCommand with the bucket + key', async () => {
      s3Mock.on(DeleteObjectCommand).resolves({});

      await service.deleteFile(key);

      const calls = s3Mock.commandCalls(DeleteObjectCommand);
      expect(calls).toHaveLength(1);
      expect(calls[0].args[0].input).toEqual({
        Bucket: TEST_BUCKET,
        Key: key,
      });
    });

    it('wraps S3 errors in InternalServerErrorException', async () => {
      s3Mock.on(DeleteObjectCommand).rejects(new Error('delete blew up'));

      await expect(service.deleteFile(key)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('getPublicUrl', () => {
    it('should return url with public endpoint', () => {
      expect(service.getPublicUrl('abc123')).toBe(
        `${TEST_PUBLIC_ENDPOINT}/abc123`,
      );
    });

    it('should throw when public endpoint is not configured', () => {
      const configWithoutEndpoint = {
        get: jest.fn((k: string) => {
          if (k === 'FILE_PLUGIN_PUBLIC_ENDPOINT') return null;
          if (k === 'S3_REGION') return TEST_REGION;
          if (k === 'S3_ENDPOINT') return TEST_ENDPOINT;
          if (k === 'S3_BUCKET') return TEST_BUCKET;
          if (k === 'S3_ACCESS_KEY_ID') return TEST_KEY;
          if (k === 'S3_SECRET_ACCESS_KEY') return TEST_SECRET;
          return null;
        }),
      } as unknown as ConfigService;

      const svc = new S3StorageService(configWithoutEndpoint);
      expect(() => svc.getPublicUrl('abc123')).toThrow(
        'FILE_PLUGIN_PUBLIC_ENDPOINT is not configured',
      );
    });
  });

  let service: S3StorageService;

  const TEST_BUCKET = 'test-bucket';
  const TEST_REGION = 'test-region';
  const TEST_ENDPOINT = 'https://test.endpoint';
  const TEST_KEY = 'AKIA_TEST';
  const TEST_SECRET = 'SECRET_TEST';
  const TEST_PUBLIC_ENDPOINT = 'https://cdn.example.com';

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

  beforeEach(() => {
    s3Mock.reset();
    s3Mock.on(PutObjectCommand).resolves({});

    const configService = {
      get: jest.fn((k: string) => {
        switch (k) {
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
          case 'FILE_PLUGIN_PUBLIC_ENDPOINT':
            return TEST_PUBLIC_ENDPOINT;
          default:
            return null;
        }
      }),
    } as unknown as ConfigService;

    service = new S3StorageService(configService);
  });
});
