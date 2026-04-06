import { Test, TestingModule } from '@nestjs/testing';
import { nanoid } from 'nanoid';
import { ApiKeyType } from 'src/__generated__/client';
import { testCreateUser } from 'src/__tests__/create-models';
import { ApiKeyService } from 'src/features/api-key/api-key.service';
import { RevisiumCacheModule } from 'src/infrastructure/cache';
import { AuthCacheService } from 'src/infrastructure/cache/services/auth-cache.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

describe('ApiKeyService', () => {
  let module: TestingModule;
  let service: ApiKeyService;
  let prisma: PrismaService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [RevisiumCacheModule.forRootAsync()],
      providers: [ApiKeyService, PrismaService],
    }).compile();

    service = module.get<ApiKeyService>(ApiKeyService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('generateKey', () => {
    it('should generate a key with rev_ prefix', () => {
      const result = service.generateKey();

      expect(result.key).toMatch(/^rev_[A-Za-z0-9_-]{22}$/);
      expect(result.prefix).toBe('rev_');
      expect(result.hash).toHaveLength(64);
    });

    it('should generate unique keys', () => {
      const key1 = service.generateKey();
      const key2 = service.generateKey();

      expect(key1.key).not.toBe(key2.key);
      expect(key1.hash).not.toBe(key2.hash);
    });

    it('should produce consistent hashes for the same key', () => {
      const result = service.generateKey();
      const rehash = service.hashKey(result.key);

      expect(rehash).toBe(result.hash);
    });
  });

  describe('validateKeyFormat', () => {
    it('should accept valid key format', () => {
      const { key } = service.generateKey();
      expect(service.validateKeyFormat(key)).toBe(true);
    });

    it('should reject keys without rev_ prefix', () => {
      expect(
        service.validateKeyFormat('rk_personal_abc123abc123abc123abc1'),
      ).toBe(false);
    });

    it('should reject keys with wrong length', () => {
      expect(service.validateKeyFormat('rev_short')).toBe(false);
      expect(
        service.validateKeyFormat('rev_waytoolongwaytoolongwaytoolong'),
      ).toBe(false);
    });

    it('should reject empty string', () => {
      expect(service.validateKeyFormat('')).toBe(false);
    });

    it('should reject keys with invalid characters', () => {
      expect(service.validateKeyFormat('rev_abc123abc123abc123ab!!')).toBe(
        false,
      );
    });
  });

  describe('findByHash', () => {
    it('should find an existing key by hash', async () => {
      const userId = nanoid();
      await testCreateUser(prisma, { id: userId });

      const { hash, prefix } = service.generateKey();
      const created = await prisma.apiKey.create({
        data: {
          prefix,
          keyHash: hash,
          type: ApiKeyType.PERSONAL,
          name: 'test-key',
          userId,
        },
      });

      const found = await service.findByHash(hash);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
    });

    it('should return null for unknown hash', async () => {
      const result = await service.findByHash('nonexistent-hash');
      expect(result).toBeNull();
    });

    it('should go through AuthCacheService (noop in tests)', async () => {
      const userId = nanoid();
      await testCreateUser(prisma, { id: userId });

      const { hash, prefix } = service.generateKey();
      await prisma.apiKey.create({
        data: {
          prefix,
          keyHash: hash,
          type: ApiKeyType.PERSONAL,
          name: 'cache-test-key',
          userId,
        },
      });

      const authCache = module.get(AuthCacheService);
      const spy = jest.spyOn(authCache, 'apiKeyByHash');

      const result = await service.findByHash(hash);

      expect(result).not.toBeNull();
      expect(spy).toHaveBeenCalledWith(hash, expect.any(Function));

      spy.mockRestore();
    });
  });
});
