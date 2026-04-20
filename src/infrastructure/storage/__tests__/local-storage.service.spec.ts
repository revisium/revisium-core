import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { LocalStorageService } from '../local-storage.service';

describe('LocalStorageService', () => {
  const TEST_DIR = resolve(__dirname, '.tmp-test-uploads');

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  it('should be available', () => {
    const service = createService();
    expect(service.isAvailable).toBe(true);
  });

  it('should create storage directory on init', () => {
    createService();
    expect(existsSync(TEST_DIR)).toBe(true);
  });

  describe('uploadFile', () => {
    it('should write file to disk', async () => {
      const service = createService();
      const result = await service.uploadFile(file, 'test-key');

      expect(result).toEqual({ key: 'test-key' });

      const filePath = resolve(TEST_DIR, 'test-key');
      expect(existsSync(filePath)).toBe(true);
      expect(readFileSync(filePath).toString()).toBe('test data');
    });

    it('should write mime-type meta file', async () => {
      const service = createService();
      await service.uploadFile(file, 'test-key');

      const metaPath = resolve(TEST_DIR, 'test-key.meta');
      expect(existsSync(metaPath)).toBe(true);
      expect(readFileSync(metaPath, 'utf-8')).toBe('text/plain');
    });

    it('should reject path traversal', async () => {
      const service = createService();
      await expect(
        service.uploadFile(file, '../../../etc/passwd'),
      ).rejects.toThrow('Invalid file path');
    });
  });

  describe('readFile', () => {
    it('should read file with content type', async () => {
      const service = createService();
      await service.uploadFile(file, 'read-test');

      const result = await service.readFile('read-test');
      expect(result).not.toBeNull();
      expect(result?.buffer.toString()).toBe('test data');
      expect(result?.contentType).toBe('text/plain');
    });

    it('should return null for non-existent file', async () => {
      const service = createService();
      expect(await service.readFile('non-existent')).toBeNull();
    });

    it('should default to application/octet-stream when meta missing', async () => {
      const service = createService();
      const filePath = resolve(TEST_DIR, 'no-meta');
      writeFileSync(filePath, 'data');

      const result = await service.readFile('no-meta');
      expect(result?.contentType).toBe('application/octet-stream');
    });

    it('should reject path traversal', async () => {
      const service = createService();
      await expect(service.readFile('../../../etc/passwd')).rejects.toThrow(
        'Invalid file path',
      );
    });
  });

  describe('deleteFile', () => {
    it('removes the uploaded file and its meta sidecar', async () => {
      const service = createService();
      await service.uploadFile(file, 'remove-me');

      await service.deleteFile('remove-me');

      expect(existsSync(resolve(TEST_DIR, 'remove-me'))).toBe(false);
      expect(existsSync(resolve(TEST_DIR, 'remove-me.meta'))).toBe(false);
    });

    it('is a no-op when the key does not exist on disk', async () => {
      const service = createService();

      await expect(service.deleteFile('nothing-here')).resolves.toBeUndefined();
    });

    it('rejects path traversal before touching disk', async () => {
      const service = createService();

      await expect(service.deleteFile('../../../etc/passwd')).rejects.toThrow(
        'Invalid file path',
      );
    });
  });

  describe('getPublicUrl', () => {
    it('should use explicit endpoint when set', () => {
      const service = createService({
        FILE_PLUGIN_PUBLIC_ENDPOINT: 'https://cdn.example.com/files',
      });
      expect(service.getPublicUrl('abc123')).toBe(
        'https://cdn.example.com/files/abc123',
      );
    });

    it('should auto-generate endpoint from PORT', () => {
      const service = createService({ PORT: '3000' });
      expect(service.getPublicUrl('abc123')).toBe(
        'http://localhost:3000/files/abc123',
      );
    });

    it('should default to port 8080', () => {
      const service = createService();
      expect(service.getPublicUrl('abc123')).toBe(
        'http://localhost:8080/files/abc123',
      );
    });
  });

  const file: Express.Multer.File = {
    buffer: Buffer.from('test data'),
    mimetype: 'text/plain',
    size: 9,
    fieldname: '',
    originalname: 'test.txt',
    encoding: '',
    stream: null as any,
    destination: '',
    filename: '',
    path: '',
  };

  function createService(overrides: Record<string, string> = {}) {
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'STORAGE_LOCAL_PATH') return TEST_DIR;
        if (key in overrides) return overrides[key];
        return null;
      }),
    } as unknown as ConfigService;

    return new LocalStorageService(configService);
  }
});
