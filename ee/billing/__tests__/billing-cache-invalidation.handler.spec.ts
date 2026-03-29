import { Test, TestingModule } from '@nestjs/testing';
import { nanoid } from 'nanoid';
import { CacheService } from 'src/infrastructure/cache/services/cache.service';
import { NoopCacheService } from 'src/infrastructure/cache/services/noop-cache.service';
import { CACHE_SERVICE } from 'src/infrastructure/cache/services/cache.tokens';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  RowCreatedEvent,
  RowUpdatedEvent,
  RowDeletedEvent,
  RowsDeletedEvent,
  RowRenamedEvent,
  RevisionRevertedEvent,
  RevisionCommittedEvent,
} from 'src/infrastructure/cache';
import { BillingCacheService } from '../cache/billing-cache.service';
import {
  BillingRowCreatedHandler,
  BillingRowUpdatedHandler,
  BillingRowDeletedHandler,
  BillingRowsDeletedHandler,
  BillingRowRenamedHandler,
  BillingRevisionRevertedHandler,
  BillingRevisionCommittedHandler,
} from '../cache/billing-cache-invalidation.handler';

describe('BillingCacheInvalidationHandlers', () => {
  let module: TestingModule;
  let billingCache: BillingCacheService;
  let prisma: PrismaService;
  let invalidateSpy: jest.SpyInstance;

  let orgId: string;
  let revisionId: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [
        BillingCacheService,
        CacheService,
        { provide: CACHE_SERVICE, useClass: NoopCacheService },
        BillingRowCreatedHandler,
        BillingRowUpdatedHandler,
        BillingRowDeletedHandler,
        BillingRowsDeletedHandler,
        BillingRowRenamedHandler,
        BillingRevisionRevertedHandler,
        BillingRevisionCommittedHandler,
      ],
    }).compile();

    billingCache = module.get(BillingCacheService);
    prisma = module.get(PrismaService);

    // Create test data: org → project → branch → revision
    orgId = nanoid();
    const projectId = nanoid();
    const branchId = nanoid();
    revisionId = nanoid();

    await prisma.organization.create({
      data: { id: orgId, createdId: nanoid() },
    });
    await prisma.project.create({
      data: {
        id: projectId,
        name: `proj-${projectId}`,
        organizationId: orgId,
        branches: {
          create: {
            id: branchId,
            name: 'master',
            revisions: {
              create: { id: revisionId, isHead: true },
            },
          },
        },
      },
    });
  });

  beforeEach(() => {
    invalidateSpy = jest.spyOn(billingCache, 'invalidateOrgUsage');
  });

  afterEach(() => {
    invalidateSpy.mockRestore();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should invalidate on RowCreatedEvent', async () => {
    const handler = module.get(BillingRowCreatedHandler);
    await handler.handle(new RowCreatedEvent(revisionId, 'table1', 'row1'));
    expect(invalidateSpy).toHaveBeenCalledWith(orgId);
  });

  it('should invalidate on RowUpdatedEvent', async () => {
    const handler = module.get(BillingRowUpdatedHandler);
    await handler.handle(new RowUpdatedEvent(revisionId, 'table1', 'row1'));
    expect(invalidateSpy).toHaveBeenCalledWith(orgId);
  });

  it('should invalidate on RowDeletedEvent', async () => {
    const handler = module.get(BillingRowDeletedHandler);
    await handler.handle(new RowDeletedEvent(revisionId, 'table1', 'row1'));
    expect(invalidateSpy).toHaveBeenCalledWith(orgId);
  });

  it('should invalidate on RowsDeletedEvent', async () => {
    const handler = module.get(BillingRowsDeletedHandler);
    await handler.handle(
      new RowsDeletedEvent(revisionId, 'table1', ['row1', 'row2']),
    );
    expect(invalidateSpy).toHaveBeenCalledWith(orgId);
  });

  it('should invalidate on RowRenamedEvent', async () => {
    const handler = module.get(BillingRowRenamedHandler);
    await handler.handle(
      new RowRenamedEvent(revisionId, 'table1', 'oldRow', 'newRow'),
    );
    expect(invalidateSpy).toHaveBeenCalledWith(orgId);
  });

  it('should invalidate on RevisionRevertedEvent', async () => {
    const handler = module.get(BillingRevisionRevertedHandler);
    await handler.handle(new RevisionRevertedEvent(revisionId));
    expect(invalidateSpy).toHaveBeenCalledWith(orgId);
  });

  it('should invalidate on RevisionCommittedEvent', async () => {
    const handler = module.get(BillingRevisionCommittedHandler);
    await handler.handle(new RevisionCommittedEvent('head-rev', revisionId));
    expect(invalidateSpy).toHaveBeenCalledWith(orgId);
  });

  it('should not invalidate for unknown revisionId', async () => {
    const handler = module.get(BillingRowCreatedHandler);
    await handler.handle(
      new RowCreatedEvent('nonexistent-rev', 'table1', 'row1'),
    );
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
