import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
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
import { PrismaService } from 'src/infrastructure/database/prisma.service';

describe('RevokeApiKeyHandler', () => {
  let kit: ApiKeyCommandTestKit;
  let commandBus: CommandBus;
  let prisma: PrismaService;

  beforeAll(async () => {
    kit = await createApiKeyCommandTestKit();
    commandBus = kit.commandBus;
    prisma = kit.prismaService;
  });

  afterAll(async () => {
    await kit.close();
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
