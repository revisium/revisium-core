import { Test, TestingModule } from '@nestjs/testing';
import { nanoid } from 'nanoid';
import { EndpointType } from 'src/__generated__/client';
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
    it('should expose the max endpoints count across projects', async () => {
      const orgId = await createOrg();
      const firstProject = await createProjectWithRows(orgId, 0);
      const secondProject = await createProjectWithRows(orgId, 0);
      const graphqlVersionId = await createEndpointVersion(
        EndpointType.GRAPHQL,
      );
      const restVersionId = await createEndpointVersion(EndpointType.REST_API);
      const secondBranchId = nanoid();
      const secondRevisionId = nanoid();

      await prisma.branch.create({
        data: {
          id: secondBranchId,
          name: `feature-${secondBranchId}`,
          projectId: secondProject.projectId,
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
          revisionId: firstProject.revisionId,
          versionId: graphqlVersionId,
        },
      });

      await prisma.endpoint.create({
        data: {
          id: nanoid(),
          type: EndpointType.GRAPHQL,
          revisionId: secondProject.revisionId,
          versionId: graphqlVersionId,
        },
      });
      await prisma.endpoint.create({
        data: {
          id: nanoid(),
          type: EndpointType.REST_API,
          revisionId: secondProject.revisionId,
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

      const result = await service.computeUsageSummary(orgId, {
        row_versions: 10_000,
        projects: 3,
        seats: 1,
        storage_bytes: 500_000_000,
        endpoints_per_project: 2,
      });

      expect(result.endpointsPerProject.current).toBe(2);
      expect(result.endpointsPerProject.limit).toBe(2);
      expect(result.endpointsPerProject.percentage).toBe(100);
    });
  });
});
