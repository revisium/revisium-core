import { BadRequestException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { nanoid } from 'nanoid';
import { ApiKeyType } from 'src/__generated__/client';
import { testCreateUser } from 'src/testing/factories/create-models';
import {
  createApiKeyCommandTestKit,
  type ApiKeyCommandTestKit,
} from 'src/testing/kit/create-api-key-command-test-kit';
import { CreateApiKeyCommand } from 'src/features/api-key/commands/impl';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

describe('CreateApiKeyHandler — key limits', () => {
  let kit: ApiKeyCommandTestKit;
  let commandBus: CommandBus;
  let prisma: PrismaService;

  const TEST_PERSONAL_LIMIT = 3;
  const TEST_SERVICE_LIMIT = 3;

  beforeAll(async () => {
    kit = await createApiKeyCommandTestKit({
      configValues: {
        API_KEY_MAX_PER_USER: TEST_PERSONAL_LIMIT,
        API_KEY_MAX_SERVICE_PER_ORG: TEST_SERVICE_LIMIT,
      },
    });
    commandBus = kit.commandBus;
    prisma = kit.prismaService;
  });

  afterAll(async () => {
    await kit.close();
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
