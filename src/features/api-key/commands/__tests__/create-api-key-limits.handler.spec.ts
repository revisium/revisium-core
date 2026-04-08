import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandBus, CqrsModule } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { nanoid } from 'nanoid';
import { ApiKeyType } from 'src/__generated__/client';
import { testCreateUser } from 'src/__tests__/create-models';
import { ApiKeyService } from 'src/features/api-key/api-key.service';
import { CreateApiKeyHandler } from 'src/features/api-key/commands/handlers';
import { CreateApiKeyCommand } from 'src/features/api-key/commands/impl';
import { RevisiumCacheModule } from 'src/infrastructure/cache';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

describe('CreateApiKeyHandler — key limits', () => {
  let commandBus: CommandBus;
  let prisma: PrismaService;

  const TEST_PERSONAL_LIMIT = 3;
  const TEST_SERVICE_LIMIT = 3;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule, RevisiumCacheModule.forRootAsync()],
      providers: [
        CreateApiKeyHandler,
        ApiKeyService,
        PrismaService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'API_KEY_MAX_PER_USER') return TEST_PERSONAL_LIMIT;
              if (key === 'API_KEY_MAX_SERVICE_PER_ORG')
                return TEST_SERVICE_LIMIT;
              return undefined;
            },
          },
        },
      ],
    }).compile();

    await module.init();

    commandBus = module.get(CommandBus);
    prisma = module.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('personal key limit', () => {
    it('should allow creating keys up to the limit', async () => {
      const userId = nanoid();
      await testCreateUser(prisma, { id: userId });

      for (let i = 0; i < TEST_PERSONAL_LIMIT; i++) {
        const result = await commandBus.execute(
          new CreateApiKeyCommand({
            type: ApiKeyType.PERSONAL,
            name: `Key ${i}`,
            userId,
          }),
        );
        expect(result.id).toBeDefined();
      }
    });

    it('should reject when personal key limit is reached', async () => {
      const userId = nanoid();
      await testCreateUser(prisma, { id: userId });

      for (let i = 0; i < TEST_PERSONAL_LIMIT; i++) {
        await commandBus.execute(
          new CreateApiKeyCommand({
            type: ApiKeyType.PERSONAL,
            name: `Key ${i}`,
            userId,
          }),
        );
      }

      await expect(
        commandBus.execute(
          new CreateApiKeyCommand({
            type: ApiKeyType.PERSONAL,
            name: 'One too many',
            userId,
          }),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow creating after revoking a key', async () => {
      const userId = nanoid();
      await testCreateUser(prisma, { id: userId });

      const keys: string[] = [];
      for (let i = 0; i < TEST_PERSONAL_LIMIT; i++) {
        const result = await commandBus.execute(
          new CreateApiKeyCommand({
            type: ApiKeyType.PERSONAL,
            name: `Key ${i}`,
            userId,
          }),
        );
        keys.push(result.id);
      }

      await prisma.apiKey.update({
        where: { id: keys[0] },
        data: { revokedAt: new Date() },
      });

      const result = await commandBus.execute(
        new CreateApiKeyCommand({
          type: ApiKeyType.PERSONAL,
          name: 'After revoke',
          userId,
        }),
      );
      expect(result.id).toBeDefined();
    });
  });

  describe('service key limit', () => {
    it('should reject when service key limit is reached', async () => {
      const orgId = `org-${nanoid(8)}`;
      await prisma.organization.create({
        data: { id: orgId, createdId: nanoid() },
      });

      const permissions = { rules: [{ action: ['read'], subject: ['Row'] }] };

      for (let i = 0; i < TEST_SERVICE_LIMIT; i++) {
        await commandBus.execute(
          new CreateApiKeyCommand({
            type: ApiKeyType.SERVICE,
            name: `Service ${i}`,
            serviceId: `svc-${nanoid(8)}`,
            organizationId: orgId,
            permissions,
          }),
        );
      }

      await expect(
        commandBus.execute(
          new CreateApiKeyCommand({
            type: ApiKeyType.SERVICE,
            name: 'One too many',
            serviceId: `svc-${nanoid(8)}`,
            organizationId: orgId,
            permissions,
          }),
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('internal keys are not limited', () => {
    it('should not count internal keys against limits', async () => {
      const userId = nanoid();
      await testCreateUser(prisma, { id: userId });

      for (let i = 0; i < TEST_PERSONAL_LIMIT + 2; i++) {
        await commandBus.execute(
          new CreateApiKeyCommand({
            type: ApiKeyType.INTERNAL,
            name: `Internal ${i}`,
            internalServiceName: `svc-${nanoid(8)}`,
          }),
        );
      }

      const result = await commandBus.execute(
        new CreateApiKeyCommand({
          type: ApiKeyType.PERSONAL,
          name: 'Personal after internals',
          userId,
        }),
      );
      expect(result.id).toBeDefined();
    });
  });
});
