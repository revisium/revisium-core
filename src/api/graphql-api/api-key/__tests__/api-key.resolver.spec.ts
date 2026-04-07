import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { nanoid } from 'nanoid';
import { testCreateUser } from 'src/__tests__/create-models';
import { ApiKeyApiService } from 'src/features/api-key/api-key-api.service';
import { ApiKeyService } from 'src/features/api-key/api-key.service';
import { CreateApiKeyHandler } from 'src/features/api-key/commands/handlers';
import { RevokeApiKeyHandler } from 'src/features/api-key/commands/handlers';
import { RotateApiKeyHandler } from 'src/features/api-key/commands/handlers';
import { GetApiKeyByIdHandler } from 'src/features/api-key/queries/handlers';
import { GetApiKeysHandler } from 'src/features/api-key/queries/handlers';
import { RevisiumCacheModule } from 'src/infrastructure/cache';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

describe('ApiKeyApiService', () => {
  let service: ApiKeyApiService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule, RevisiumCacheModule.forRootAsync()],
      providers: [
        ApiKeyApiService,
        ApiKeyService,
        CreateApiKeyHandler,
        RevokeApiKeyHandler,
        RotateApiKeyHandler,
        GetApiKeyByIdHandler,
        GetApiKeysHandler,
        PrismaService,
      ],
    }).compile();

    await module.init();

    service = module.get(ApiKeyApiService);
    prisma = module.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('createPersonalApiKey', () => {
    it('should create a personal key and return id + key', async () => {
      const userId = nanoid();
      await testCreateUser(prisma, { id: userId });

      const result = await service.createPersonalApiKey({
        name: 'My CI Key',
        userId,
      });

      expect(result.key).toMatch(/^rev_[A-Za-z0-9_-]{22}$/);
      expect(result.id).toBeDefined();
    });

    it('should create a key with scopes', async () => {
      const userId = nanoid();
      await testCreateUser(prisma, { id: userId });

      const result = await service.createPersonalApiKey({
        name: 'Scoped Key',
        userId,
        organizationId: 'org-1',
        projectIds: ['proj-1'],
        branchNames: ['master'],
        tableIds: ['posts'],
        readOnly: true,
        allowedIps: ['192.168.1.0/24'],
      });

      expect(result.id).toBeDefined();

      const stored = await prisma.apiKey.findUnique({
        where: { id: result.id },
      });
      expect(stored!.organizationId).toBe('org-1');
      expect(stored!.projectIds).toEqual(['proj-1']);
      expect(stored!.branchNames).toEqual(['master']);
      expect(stored!.readOnly).toBe(true);
    });
  });

  describe('getMyApiKeys', () => {
    it('should return all keys for the user', async () => {
      const userId = nanoid();
      await testCreateUser(prisma, { id: userId });

      await service.createPersonalApiKey({ name: 'Key 1', userId });
      await service.createPersonalApiKey({ name: 'Key 2', userId });

      const keys = await service.getMyApiKeys(userId);

      expect(keys.length).toBeGreaterThanOrEqual(2);
      const names = keys.map((k) => k.name);
      expect(names).toContain('Key 1');
      expect(names).toContain('Key 2');
    });

    it('should not include keyHash in results', async () => {
      const userId = nanoid();
      await testCreateUser(prisma, { id: userId });
      await service.createPersonalApiKey({ name: 'Key', userId });

      const keys = await service.getMyApiKeys(userId);
      for (const key of keys) {
        expect((key as any).keyHash).toBeUndefined();
      }
    });
  });

  describe('getApiKeyById', () => {
    it('should return key by id for the owner', async () => {
      const userId = nanoid();
      await testCreateUser(prisma, { id: userId });

      const created = await service.createPersonalApiKey({
        name: 'My Key',
        userId,
      });

      const key = await service.getApiKeyById(created.id, userId);
      expect(key.id).toBe(created.id);
      expect(key.name).toBe('My Key');
      expect((key as any).keyHash).toBeUndefined();
    });

    it('should reject access by another user', async () => {
      const userId = nanoid();
      const otherUserId = nanoid();
      await testCreateUser(prisma, { id: userId });
      await testCreateUser(prisma, { id: otherUserId });

      const created = await service.createPersonalApiKey({
        name: 'Private Key',
        userId,
      });

      await expect(
        service.getApiKeyById(created.id, otherUserId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException for non-existent key', async () => {
      const userId = nanoid();
      await testCreateUser(prisma, { id: userId });

      await expect(
        service.getApiKeyById('nonexistent-key', userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('revokeApiKey', () => {
    it('should revoke a key owned by the user', async () => {
      const userId = nanoid();
      await testCreateUser(prisma, { id: userId });

      const created = await service.createPersonalApiKey({
        name: 'To Revoke',
        userId,
      });

      await service.revokeApiKey(created.id, userId);

      const stored = await prisma.apiKey.findUnique({
        where: { id: created.id },
      });
      expect(stored!.revokedAt).not.toBeNull();
    });

    it('should reject revoking another users key', async () => {
      const userId = nanoid();
      const otherUserId = nanoid();
      await testCreateUser(prisma, { id: userId });
      await testCreateUser(prisma, { id: otherUserId });

      const created = await service.createPersonalApiKey({
        name: 'Not Yours',
        userId,
      });

      await expect(
        service.revokeApiKey(created.id, otherUserId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('rotateApiKey', () => {
    it('should rotate a key and return new key', async () => {
      const userId = nanoid();
      await testCreateUser(prisma, { id: userId });

      const original = await service.createPersonalApiKey({
        name: 'To Rotate',
        userId,
      });

      const rotated = await service.rotateApiKey(original.id, userId);

      expect(rotated.id).not.toBe(original.id);
      expect(rotated.key).toMatch(/^rev_[A-Za-z0-9_-]{22}$/);
      expect(rotated.key).not.toBe(original.key);

      const oldKey = await prisma.apiKey.findUnique({
        where: { id: original.id },
      });
      expect(oldKey!.revokedAt).not.toBeNull();
    });

    it('should reject rotating another users key', async () => {
      const userId = nanoid();
      const otherUserId = nanoid();
      await testCreateUser(prisma, { id: userId });
      await testCreateUser(prisma, { id: otherUserId });

      const created = await service.createPersonalApiKey({
        name: 'Not Yours',
        userId,
      });

      await expect(
        service.rotateApiKey(created.id, otherUserId),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
