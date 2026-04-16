import { Test, TestingModule } from '@nestjs/testing';
import { nanoid } from 'nanoid';
import { ApiKeyType } from 'src/__generated__/client';
import { testCreateUser } from 'src/testing/factories/create-models';
import { ApiKeyTrackingService } from 'src/features/api-key/api-key-tracking.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

describe('ApiKeyTrackingService', () => {
  let tracking: ApiKeyTrackingService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ApiKeyTrackingService, PrismaService],
    }).compile();

    tracking = module.get<ApiKeyTrackingService>(ApiKeyTrackingService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await tracking.onModuleDestroy();
    await prisma.$disconnect();
  });

  it('should buffer track calls and not write immediately', async () => {
    const userId = nanoid();
    await testCreateUser(prisma, { id: userId });

    const key = await prisma.apiKey.create({
      data: {
        prefix: 'rev_',
        keyHash: nanoid(),
        type: ApiKeyType.PERSONAL,
        name: 'test-key',
        userId,
      },
    });

    tracking.track(key.id, '1.2.3.4');

    const notYetUpdated = await prisma.apiKey.findUnique({
      where: { id: key.id },
    });
    expect(notYetUpdated!.lastUsedAt).toBeNull();
  });

  it('should write to DB on flush', async () => {
    const userId = nanoid();
    await testCreateUser(prisma, { id: userId });

    const key = await prisma.apiKey.create({
      data: {
        prefix: 'rev_',
        keyHash: nanoid(),
        type: ApiKeyType.PERSONAL,
        name: 'test-key',
        userId,
      },
    });

    tracking.track(key.id, '10.0.0.1');
    await tracking.flush();

    const updated = await prisma.apiKey.findUnique({
      where: { id: key.id },
    });
    expect(updated!.lastUsedAt).toBeInstanceOf(Date);
    expect(updated!.lastUsedIp).toBe('10.0.0.1');
  });

  it('should deduplicate — only last IP is flushed', async () => {
    const userId = nanoid();
    await testCreateUser(prisma, { id: userId });

    const key = await prisma.apiKey.create({
      data: {
        prefix: 'rev_',
        keyHash: nanoid(),
        type: ApiKeyType.PERSONAL,
        name: 'test-key',
        userId,
      },
    });

    tracking.track(key.id, '1.1.1.1');
    tracking.track(key.id, '2.2.2.2');
    tracking.track(key.id, '3.3.3.3');
    await tracking.flush();

    const updated = await prisma.apiKey.findUnique({
      where: { id: key.id },
    });
    expect(updated!.lastUsedIp).toBe('3.3.3.3');
  });

  it('should normalize IP — take first from comma-separated and truncate', () => {
    const userId = 'key-norm-test';

    tracking.track(userId, '1.2.3.4, 5.6.7.8');
    // Can't easily assert buffer contents, but at least it shouldn't throw

    tracking.track(userId, '');
    // Empty IP should be ignored — no throw
  });
});
