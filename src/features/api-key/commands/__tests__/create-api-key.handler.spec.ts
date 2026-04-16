import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
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

describe('CreateApiKeyHandler', () => {
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

  it('should create a personal key and return id + key', async () => {
    const userId = nanoid();
    await testCreateUser(prisma, { id: userId });

    const result = await commandBus.execute(
      new CreateApiKeyCommand({
        type: ApiKeyType.PERSONAL,
        name: 'CI/CD Key',
        userId,
      }),
    );

    expect(result.key).toMatch(/^rev_[A-Za-z0-9_-]{22}$/);
    expect(result.id).toBeDefined();
    expect(Object.keys(result)).toEqual(['id', 'key']);

    const stored = await prisma.apiKey.findUnique({
      where: { id: result.id },
    });
    expect(stored).not.toBeNull();
    expect(stored!.keyHash).toHaveLength(64);
    expect(stored!.userId).toBe(userId);
  });

  it('should create a service key with scope', async () => {
    const orgId = `org-${nanoid(8)}`;
    await prisma.organization.create({
      data: { id: orgId, createdId: nanoid() },
    });

    const result = await commandBus.execute(
      new CreateApiKeyCommand({
        type: ApiKeyType.SERVICE,
        name: 'CRM Integration',
        serviceId: `crm-${nanoid(8)}`,
        organizationId: orgId,
        projectIds: ['proj-1'],
        branchNames: ['$default'],
        readOnly: true,
        permissions: { rules: [{ action: ['read'], subject: ['Row'] }] },
      }),
    );

    expect(result.id).toBeDefined();
    expect(result.key).toBeDefined();

    const stored = await prisma.apiKey.findUnique({
      where: { id: result.id },
    });
    expect(stored!.organizationId).toBe(orgId);
    expect(stored!.projectIds).toEqual(['proj-1']);
    expect(stored!.branchNames).toEqual(['$default']);
    expect(stored!.readOnly).toBe(true);
    expect(stored!.permissions).toEqual({
      rules: [{ action: ['read'], subject: ['Row'] }],
    });
  });

  it('should create an internal key', async () => {
    const result = await commandBus.execute(
      new CreateApiKeyCommand({
        type: ApiKeyType.INTERNAL,
        name: 'Endpoint Service',
        internalServiceName: 'endpoint',
      }),
    );

    const stored = await prisma.apiKey.findUnique({
      where: { id: result.id },
    });
    expect(stored!.internalServiceName).toBe('endpoint');
  });

  it('should require userId for PERSONAL keys', async () => {
    await expect(
      commandBus.execute(
        new CreateApiKeyCommand({
          type: ApiKeyType.PERSONAL,
          name: 'My Key',
        }),
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should require serviceId for SERVICE keys', async () => {
    await expect(
      commandBus.execute(
        new CreateApiKeyCommand({
          type: ApiKeyType.SERVICE,
          name: 'Service Key',
        }),
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should require internalServiceName for INTERNAL keys', async () => {
    await expect(
      commandBus.execute(
        new CreateApiKeyCommand({
          type: ApiKeyType.INTERNAL,
          name: 'Internal Key',
        }),
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject empty name', async () => {
    const userId = nanoid();
    await testCreateUser(prisma, { id: userId });

    await expect(
      commandBus.execute(
        new CreateApiKeyCommand({
          type: ApiKeyType.PERSONAL,
          name: '',
          userId,
        }),
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject expiresAt in the past', async () => {
    const userId = nanoid();
    await testCreateUser(prisma, { id: userId });

    await expect(
      commandBus.execute(
        new CreateApiKeyCommand({
          type: ApiKeyType.PERSONAL,
          name: 'Expired',
          userId,
          expiresAt: new Date('2020-01-01'),
        }),
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject cross-field violations', async () => {
    const userId = nanoid();
    await testCreateUser(prisma, { id: userId });

    await expect(
      commandBus.execute(
        new CreateApiKeyCommand({
          type: ApiKeyType.PERSONAL,
          name: 'Bad',
          userId,
          serviceId: 'should-not-be-here',
        }),
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject non-existent userId', async () => {
    await expect(
      commandBus.execute(
        new CreateApiKeyCommand({
          type: ApiKeyType.PERSONAL,
          name: 'Ghost User',
          userId: 'nonexistent-user',
        }),
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('should reject duplicate serviceId', async () => {
    const serviceId = `dup-${nanoid(8)}`;
    const permissions = { rules: [{ action: ['read'], subject: ['Row'] }] };
    const orgId = `org-dup-${nanoid(8)}`;
    await prisma.organization.create({
      data: { id: orgId, createdId: nanoid() },
    });

    await commandBus.execute(
      new CreateApiKeyCommand({
        type: ApiKeyType.SERVICE,
        name: 'First',
        serviceId,
        organizationId: orgId,
        permissions,
      }),
    );

    await expect(
      commandBus.execute(
        new CreateApiKeyCommand({
          type: ApiKeyType.SERVICE,
          name: 'Second',
          serviceId,
          organizationId: orgId,
          permissions,
        }),
      ),
    ).rejects.toThrow(ConflictException);
  });
});
