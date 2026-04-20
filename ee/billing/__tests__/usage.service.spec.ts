import { TestingModule } from '@nestjs/testing';
import { nanoid } from 'nanoid';
import { EndpointType } from 'src/__generated__/client';
import { LimitMetric } from 'src/features/billing/limits.interface';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { createProjectCommandTestKit } from 'src/testing/kit/create-project-command-test-kit';
import { UsageService } from '../usage/usage.service';

describe('UsageService', () => {
  let module: TestingModule;
  let service: UsageService;
  let prisma: PrismaService;
  let closeModule: () => Promise<void>;

  beforeAll(async () => {
    const kit = await createProjectCommandTestKit();
    module = kit.module;
    prisma = kit.prismaService;
    service = module.get(UsageService);
    closeModule = kit.close;
  });

  afterAll(async () => {
    await closeModule();
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

  const createEndpointVersion = async (type: EndpointType) => {
    const created = await prisma.endpointVersion.upsert({
      where: { type_version: { type, version: 1 } },
      update: {},
      create: {
        id: nanoid(),
        type,
        version: 1,
      },
    });
    return created.id;
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

    it('sums storage bytes across active and soft-deleted projects in the org', async () => {
      const orgId = await createOrg();
      const { projectId: activeProjectId } = await createProjectWithRows(
        orgId,
        0,
      );
      const { projectId: deletedProjectId } = await createProjectWithRows(
        orgId,
        0,
      );
      await prisma.project.update({
        where: { id: deletedProjectId },
        data: { isDeleted: true },
      });

      await prisma.projectFileUsage.createMany({
        data: [
          { projectId: activeProjectId, fileBytes: 1_000n },
          { projectId: deletedProjectId, fileBytes: 500n },
        ],
      });

      const result = await service.computeUsage(
        orgId,
        LimitMetric.STORAGE_BYTES,
      );
      expect(result).toBe(1_500);
    });

    it('should return 0 for api calls', async () => {
      const orgId = await createOrg();
      const result = await service.computeUsage(orgId, LimitMetric.API_CALLS);
      expect(result).toBe(0);
    });

    it('should count non-deleted endpoints in project', async () => {
      const orgId = await createOrg();
      const { projectId, revisionId } = await createProjectWithRows(orgId, 0);
      const graphqlVersionId = await createEndpointVersion(
        EndpointType.GRAPHQL,
      );
      const restVersionId = await createEndpointVersion(EndpointType.REST_API);
      const branchId = nanoid();
      const secondRevisionId = nanoid();

      await prisma.branch.create({
        data: {
          id: branchId,
          name: `feature-${branchId}`,
          projectId,
          revisions: {
            create: {
              id: secondRevisionId,
              isHead: true,
            },
          },
        },
      });

      await prisma.endpoint.create({
        data: {
          id: nanoid(),
          type: EndpointType.GRAPHQL,
          revisionId,
          versionId: graphqlVersionId,
        },
      });
      await prisma.endpoint.create({
        data: {
          id: nanoid(),
          type: EndpointType.REST_API,
          revisionId,
          versionId: restVersionId,
        },
      });
      await prisma.endpoint.create({
        data: {
          id: nanoid(),
          type: EndpointType.REST_API,
          revisionId: secondRevisionId,
          versionId: restVersionId,
          isDeleted: true,
        },
      });

      const result = await service.computeUsage(
        orgId,
        LimitMetric.ENDPOINTS_PER_PROJECT,
        { projectId },
      );

      expect(result).toBe(2);
    });
  });

  describe('computeUsageSummary', () => {
    it('should only return org-scoped usage metrics', async () => {
      const orgId = await createOrg();
      const result = await service.computeUsageSummary(orgId, {
        row_versions: 10_000,
        projects: 3,
        seats: 1,
        storage_bytes: 500_000_000,
      });

      expect(result).toEqual({
        rowVersions: expect.any(Object),
        projects: expect.any(Object),
        seats: expect.any(Object),
        storageBytes: expect.any(Object),
      });
    });
  });
});
