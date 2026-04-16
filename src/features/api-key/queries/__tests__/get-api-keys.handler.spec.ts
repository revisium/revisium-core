import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { nanoid } from 'nanoid';
import { ApiKeyType } from 'src/__generated__/client';
import { testCreateUser } from 'src/testing/factories/create-models';
import {
  createApiKeyCommandTestKit,
  type ApiKeyCommandTestKit,
} from 'src/testing/kit/create-api-key-command-test-kit';
import {
  CreateApiKeyCommand,
  RevokeApiKeyCommand,
} from 'src/features/api-key/commands/impl';
import { GetApiKeysQuery } from 'src/features/api-key/queries/impl';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

describe('GetApiKeysHandler', () => {
  let kit: ApiKeyCommandTestKit;
  let commandBus: CommandBus;
  let queryBus: QueryBus;
  let prisma: PrismaService;

  beforeAll(async () => {
    kit = await createApiKeyCommandTestKit();
    commandBus = kit.commandBus;
    queryBus = kit.queryBus;
    prisma = kit.prismaService;
  });

  afterAll(async () => {
    await kit.close();
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
