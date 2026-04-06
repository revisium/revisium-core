import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandBus, CqrsModule } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { nanoid } from 'nanoid';
import { ApiKeyType } from 'src/__generated__/client';
import { testCreateUser } from 'src/__tests__/create-models';
import { ApiKeyService } from 'src/features/api-key/api-key.service';
import {
  CreateApiKeyHandler,
  RevokeApiKeyHandler,
} from 'src/features/api-key/commands/handlers';
import {
  CreateApiKeyCommand,
  RevokeApiKeyCommand,
} from 'src/features/api-key/commands/impl';
import { RevisiumCacheModule } from 'src/infrastructure/cache';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

describe('RevokeApiKeyHandler', () => {
  let commandBus: CommandBus;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule, RevisiumCacheModule.forRootAsync()],
      providers: [
        RevokeApiKeyHandler,
        CreateApiKeyHandler,
        ApiKeyService,
        PrismaService,
      ],
    }).compile();

    await module.init();

    commandBus = module.get(CommandBus);
    prisma = module.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should set revokedAt on the key', async () => {
    const userId = nanoid();
    await testCreateUser(prisma, { id: userId });

    const created = await commandBus.execute(
      new CreateApiKeyCommand({
        type: ApiKeyType.PERSONAL,
        name: 'To Revoke',
        userId,
      }),
    );

    await commandBus.execute(new RevokeApiKeyCommand({ keyId: created.id }));

    const revoked = await prisma.apiKey.findUnique({
      where: { id: created.id },
    });
    expect(revoked!.revokedAt).toBeInstanceOf(Date);
  });

  it('should throw NotFoundException for unknown key', async () => {
    await expect(
      commandBus.execute(new RevokeApiKeyCommand({ keyId: nanoid() })),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException when revoking already revoked key', async () => {
    const userId = nanoid();
    await testCreateUser(prisma, { id: userId });

    const created = await commandBus.execute(
      new CreateApiKeyCommand({
        type: ApiKeyType.PERSONAL,
        name: 'Revoke Twice',
        userId,
      }),
    );

    await commandBus.execute(new RevokeApiKeyCommand({ keyId: created.id }));

    await expect(
      commandBus.execute(new RevokeApiKeyCommand({ keyId: created.id })),
    ).rejects.toThrow(BadRequestException);
  });
});
