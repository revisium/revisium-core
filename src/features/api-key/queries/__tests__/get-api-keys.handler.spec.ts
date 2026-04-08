import { CommandBus, CqrsModule, QueryBus } from '@nestjs/cqrs';
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
import { GetApiKeysHandler } from 'src/features/api-key/queries/handlers';
import { GetApiKeysQuery } from 'src/features/api-key/queries/impl';
import { RevisiumCacheModule } from 'src/infrastructure/cache';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

describe('GetApiKeysHandler', () => {
  let commandBus: CommandBus;
  let queryBus: QueryBus;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule, RevisiumCacheModule.forRootAsync()],
      providers: [
        GetApiKeysHandler,
        CreateApiKeyHandler,
        RevokeApiKeyHandler,
        ApiKeyService,
        PrismaService,
      ],
    }).compile();

    await module.init();

    commandBus = module.get(CommandBus);
    queryBus = module.get(QueryBus);
    prisma = module.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should not return revoked keys', async () => {
    const userId = nanoid();
    await testCreateUser(prisma, { id: userId });

    const active = await commandBus.execute(
      new CreateApiKeyCommand({
        type: ApiKeyType.PERSONAL,
        name: 'Active Key',
        userId,
      }),
    );

    const toRevoke = await commandBus.execute(
      new CreateApiKeyCommand({
        type: ApiKeyType.PERSONAL,
        name: 'Revoked Key',
        userId,
      }),
    );

    await commandBus.execute(new RevokeApiKeyCommand({ keyId: toRevoke.id }));

    const keys = await queryBus.execute(new GetApiKeysQuery({ userId }));
    const keyIds = keys.map((k: { id: string }) => k.id);

    expect(keyIds).toContain(active.id);
    expect(keyIds).not.toContain(toRevoke.id);
  });

  it('should return active keys ordered by createdAt desc', async () => {
    const userId = nanoid();
    await testCreateUser(prisma, { id: userId });

    const first = await commandBus.execute(
      new CreateApiKeyCommand({
        type: ApiKeyType.PERSONAL,
        name: 'First',
        userId,
      }),
    );

    const second = await commandBus.execute(
      new CreateApiKeyCommand({
        type: ApiKeyType.PERSONAL,
        name: 'Second',
        userId,
      }),
    );

    const keys = await queryBus.execute(new GetApiKeysQuery({ userId }));
    const keyIds = keys.map((k: { id: string }) => k.id);

    expect(keyIds.indexOf(second.id)).toBeLessThan(keyIds.indexOf(first.id));
  });
});
