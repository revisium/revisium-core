import { Test, TestingModule } from '@nestjs/testing';
import { nanoid } from 'nanoid';
import { LimitMetric } from 'src/features/billing/limits.interface';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { UsageService } from '../usage/usage.service';

describe('UsageService', () => {
  let module: TestingModule;
  let service: UsageService;
  let prisma: PrismaService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [UsageService],
    }).compile();

    service = module.get(UsageService);
    prisma = module.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const createOrg = async () => {
    const orgId = nanoid();
    await prisma.organization.create({
      data: { id: orgId, createdId: nanoid() },
    });
    return orgId;
  };

  const createProjectWithRows = async (orgId: string, rowCount: number) => {
    const projectId = nanoid();
    const branchId = nanoid();
    const revisionId = nanoid();

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
              create: {
                id: revisionId,
                isHead: true,
                isDraft: false,
              },
            },
          },
        },
      },
    });

    const tableVersionId = nanoid();
    await prisma.table.create({
      data: {
        id: `table-${nanoid()}`,
        versionId: tableVersionId,
        createdId: nanoid(),
        revisions: { connect: { id: revisionId } },
      },
    });

    for (let i = 0; i < rowCount; i++) {
      await prisma.row.create({
        data: {
          versionId: nanoid(),
          createdId: nanoid(),
          id: `row-${i}-${nanoid()}`,
          data: {},
          hash: nanoid(),
          schemaHash: nanoid(),
          tables: { connect: { versionId: tableVersionId } },
        },
      });
    }

    return { projectId, revisionId };
  };

  describe('computeUsage', () => {
    it('should count unique row versions across org', async () => {
      const orgId = await createOrg();
      await createProjectWithRows(orgId, 5);

      const result = await service.computeUsage(
        orgId,
        LimitMetric.ROW_VERSIONS,
      );
      expect(result).toBe(5);
    });

    it('should return 0 for org with no projects', async () => {
      const orgId = await createOrg();

      const result = await service.computeUsage(
        orgId,
        LimitMetric.ROW_VERSIONS,
      );
      expect(result).toBe(0);
    });

    it('should count non-deleted projects', async () => {
      const orgId = await createOrg();
      await createProjectWithRows(orgId, 0);
      await createProjectWithRows(orgId, 0);

      const result = await service.computeUsage(orgId, LimitMetric.PROJECTS);
      expect(result).toBe(2);
    });

    it('should exclude deleted projects', async () => {
      const orgId = await createOrg();
      const { projectId } = await createProjectWithRows(orgId, 0);
      await prisma.project.update({
        where: { id: projectId },
        data: { isDeleted: true },
      });

      const result = await service.computeUsage(orgId, LimitMetric.PROJECTS);
      expect(result).toBe(0);
    });

    it('should count seats', async () => {
      const orgId = await createOrg();
      const userId = nanoid();
      await prisma.user.create({
        data: {
          id: userId,
          password: 'hash',
          role: { connect: { id: 'systemUser' } },
        },
      });
      await prisma.userOrganization.create({
        data: {
          id: nanoid(),
          userId,
          organizationId: orgId,
          roleId: 'developer',
        },
      });

      const result = await service.computeUsage(orgId, LimitMetric.SEATS);
      expect(result).toBe(1);
    });

    it('should return 0 for storage bytes', async () => {
      const orgId = await createOrg();
      const result = await service.computeUsage(
        orgId,
        LimitMetric.STORAGE_BYTES,
      );
      expect(result).toBe(0);
    });

    it('should return 0 for api calls', async () => {
      const orgId = await createOrg();
      const result = await service.computeUsage(orgId, LimitMetric.API_CALLS);
      expect(result).toBe(0);
    });
  });

  describe('findSubscription', () => {
    it('should return subscription when exists', async () => {
      const orgId = await createOrg();
      await prisma.subscription.create({
        data: { organizationId: orgId, planId: 'free' },
      });

      const result = await service.findSubscription(orgId);
      expect(result).toBeDefined();
      expect(result!.planId).toBe('free');
    });

    it('should return null when no subscription', async () => {
      const orgId = await createOrg();

      const result = await service.findSubscription(orgId);
      expect(result).toBeNull();
    });
  });
});
