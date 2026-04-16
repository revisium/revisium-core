import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandBus, CqrsModule } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { nanoid } from 'nanoid';
import { ApiKeyType } from 'src/__generated__/client';
import { testCreateUser } from 'src/testing/factories/create-models';
import { ApiKeyService } from 'src/features/api-key/api-key.service';
import {
  CreateApiKeyHandler,
  RevokeApiKeyHandler,
  RotateApiKeyHandler,
} from 'src/features/api-key/commands/handlers';
import {
  CreateApiKeyCommand,
  RevokeApiKeyCommand,
  RotateApiKeyCommand,
} from 'src/features/api-key/commands/impl';
import { RevisiumCacheModule } from 'src/infrastructure/cache';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

describe('RotateApiKeyHandler', () => {
  let commandBus: CommandBus;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule, RevisiumCacheModule.forRootAsync()],
      providers: [
        RotateApiKeyHandler,
        RevokeApiKeyHandler,
        CreateApiKeyHandler,
        ApiKeyService,
        PrismaService,
        { provide: ConfigService, useValue: { get: () => undefined } },
      ],
    }).compile();

    await module.init();

    commandBus = module.get(CommandBus);
    prisma = module.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should create new key and revoke old one', async () => {
    const userId = nanoid();
    await testCreateUser(prisma, { id: userId });

    const original = await commandBus.execute(
      new CreateApiKeyCommand({
        type: ApiKeyType.PERSONAL,
        name: 'To Rotate',
        userId,
      }),
    );

    const rotated = await commandBus.execute(
      new RotateApiKeyCommand({ keyId: original.id }),
    );

    expect(rotated.key).toMatch(/^rev_[A-Za-z0-9_-]{22}$/);
    expect(rotated.key).not.toBe(original.key);
    expect(Object.keys(rotated)).toEqual(['id', 'key']);

    const oldKey = await prisma.apiKey.findUnique({
      where: { id: original.id },
    });
    expect(oldKey!.revokedAt).toBeInstanceOf(Date);
    expect(oldKey!.replacedById).toBe(rotated.id);

    const newKey = await prisma.apiKey.findUnique({
      where: { id: rotated.id },
    });
    expect(newKey!.revokedAt).toBeNull();
    expect(newKey!.userId).toBe(userId);
  });

  it('should preserve serviceId on rotated service key', async () => {
    const serviceId = `svc-${nanoid(8)}`;
    const orgId = `org-rot-${nanoid(8)}`;
    await prisma.organization.create({
      data: { id: orgId, createdId: nanoid() },
    });

    const original = await commandBus.execute(
      new CreateApiKeyCommand({
        type: ApiKeyType.SERVICE,
        name: 'Service Rotate',
        serviceId,
        organizationId: orgId,
        permissions: { rules: [{ action: ['read'], subject: ['Row'] }] },
      }),
    );

    const rotated = await commandBus.execute(
      new RotateApiKeyCommand({ keyId: original.id }),
    );

    const newKey = await prisma.apiKey.findUnique({
      where: { id: rotated.id },
    });
    expect(newKey!.serviceId).toBe(serviceId);

    const oldKey = await prisma.apiKey.findUnique({
      where: { id: original.id },
    });
    expect(oldKey!.serviceId).not.toBe(serviceId);
  });

  it('should throw NotFoundException for unknown key', async () => {
    await expect(
      commandBus.execute(new RotateApiKeyCommand({ keyId: nanoid() })),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException when rotating an expired key', async () => {
    const userId = nanoid();
    await testCreateUser(prisma, { id: userId });

    const created = await commandBus.execute(
      new CreateApiKeyCommand({
        type: ApiKeyType.PERSONAL,
        name: 'Expired Key',
        userId,
        expiresAt: new Date(Date.now() + 100),
      }),
    );

    await new Promise((resolve) => setTimeout(resolve, 200));

    await expect(
      commandBus.execute(new RotateApiKeyCommand({ keyId: created.id })),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException when rotating a revoked key', async () => {
    const userId = nanoid();
    await testCreateUser(prisma, { id: userId });

    const created = await commandBus.execute(
      new CreateApiKeyCommand({
        type: ApiKeyType.PERSONAL,
        name: 'Revoke Then Rotate',
        userId,
      }),
    );

    await commandBus.execute(new RevokeApiKeyCommand({ keyId: created.id }));

    await expect(
      commandBus.execute(new RotateApiKeyCommand({ keyId: created.id })),
    ).rejects.toThrow(BadRequestException);
  });
});
