import { Test, TestingModule } from '@nestjs/testing';
import { nanoid } from 'nanoid';
import { CacheService } from 'src/infrastructure/cache/services/cache.service';
import { NoopCacheService } from 'src/infrastructure/cache/services/noop-cache.service';
import { CACHE_SERVICE } from 'src/infrastructure/cache/services/cache.tokens';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { BillingCacheService } from '../cache/billing-cache.service';

describe('BillingCacheService', () => {
  let module: TestingModule;
  let service: BillingCacheService;
  let prisma: PrismaService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [
        BillingCacheService,
        CacheService,
        { provide: CACHE_SERVICE, useClass: NoopCacheService },
      ],
    }).compile();

    service = module.get(BillingCacheService);
    prisma = module.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('subscription', () => {
    it('should call factory and return result', async () => {
      const factory = jest.fn().mockResolvedValue({ planId: 'free' });

      const result = await service.subscription('org-1', factory);
      expect(result).toEqual({ planId: 'free' });
      expect(factory).toHaveBeenCalled();
    });
  });

  describe('usage', () => {
    it('should call factory and return result', async () => {
      const factory = jest.fn().mockResolvedValue(42);

      const result = await service.usage('org-1', 'projects', factory);
      expect(result).toBe(42);
      expect(factory).toHaveBeenCalled();
    });
  });

  describe('resolveOrgId', () => {
    it('should resolve organizationId from revisionId', async () => {
      const orgId = nanoid();
      const projectId = nanoid();
      const branchId = nanoid();
      const revisionId = nanoid();

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

      const result = await service.resolveOrgId(revisionId);
      expect(result).toBe(orgId);
    });

    it('should return null for unknown revisionId', async () => {
      const result = await service.resolveOrgId('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('invalidation', () => {
    it('should not throw on invalidateOrgUsage', async () => {
      await expect(
        service.invalidateOrgUsage('org-1'),
      ).resolves.toBeUndefined();
    });

    it('should not throw on invalidateOrgBilling', async () => {
      await expect(
        service.invalidateOrgBilling('org-1'),
      ).resolves.toBeUndefined();
    });
  });
});
