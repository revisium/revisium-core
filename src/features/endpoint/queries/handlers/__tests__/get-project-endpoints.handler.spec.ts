import { QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { EndpointType } from 'src/__generated__/client';
import { prepareProject } from 'src/__tests__/utils/prepareProject';
import { CoreModule } from 'src/core/core.module';
import {
  GetProjectEndpointsQuery,
  GetProjectEndpointsReturnType,
} from 'src/features/endpoint/queries/impl';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

describe('GetProjectEndpointsHandler', () => {
  it('should return endpoints for a project', async () => {
    const { organizationId, projectName, headEndpointId, draftEndpointId } =
      await prepareProject(prismaService);

    const result = await runTransaction(
      new GetProjectEndpointsQuery({
        organizationId,
        projectName,
        first: 10,
      }),
    );

    expect(result.totalCount).toBe(2);
    expect(result.edges).toHaveLength(2);

    const endpointIds = result.edges.map((edge) => edge.node.id);
    expect(endpointIds).toContain(headEndpointId);
    expect(endpointIds).toContain(draftEndpointId);
  });

  it('should filter endpoints by branchId', async () => {
    const project1 = await prepareProject(prismaService);
    const project2 = await prepareProject(prismaService);

    const result = await runTransaction(
      new GetProjectEndpointsQuery({
        organizationId: project1.organizationId,
        projectName: project1.projectName,
        branchId: project1.branchId,
        first: 10,
      }),
    );

    expect(result.totalCount).toBe(2);
    expect(result.edges).toHaveLength(2);

    const endpointIds = result.edges.map((edge) => edge.node.id);
    expect(endpointIds).toContain(project1.headEndpointId);
    expect(endpointIds).toContain(project1.draftEndpointId);
    expect(endpointIds).not.toContain(project2.headEndpointId);
    expect(endpointIds).not.toContain(project2.draftEndpointId);
  });

  it('should filter endpoints by type', async () => {
    const { organizationId, projectName, headEndpointId, draftEndpointId } =
      await prepareProject(prismaService);

    const restApiResult = await runTransaction(
      new GetProjectEndpointsQuery({
        organizationId,
        projectName,
        type: EndpointType.REST_API,
        first: 10,
      }),
    );

    expect(restApiResult.totalCount).toBe(1);
    expect(restApiResult.edges).toHaveLength(1);
    expect(restApiResult.edges[0].node.id).toBe(headEndpointId);
    expect(restApiResult.edges[0].node.type).toBe(EndpointType.REST_API);

    const graphqlResult = await runTransaction(
      new GetProjectEndpointsQuery({
        organizationId,
        projectName,
        type: EndpointType.GRAPHQL,
        first: 10,
      }),
    );

    expect(graphqlResult.totalCount).toBe(1);
    expect(graphqlResult.edges).toHaveLength(1);
    expect(graphqlResult.edges[0].node.id).toBe(draftEndpointId);
    expect(graphqlResult.edges[0].node.type).toBe(EndpointType.GRAPHQL);
  });

  it('should not return deleted endpoints', async () => {
    const { organizationId, projectName, headEndpointId, draftEndpointId } =
      await prepareProject(prismaService);

    await prismaService.endpoint.update({
      where: { id: headEndpointId },
      data: { isDeleted: true },
    });

    const result = await runTransaction(
      new GetProjectEndpointsQuery({
        organizationId,
        projectName,
        first: 10,
      }),
    );

    expect(result.totalCount).toBe(1);
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].node.id).toBe(draftEndpointId);
  });

  it('should paginate results', async () => {
    const { organizationId, projectName } = await prepareProject(prismaService);

    const firstPage = await runTransaction(
      new GetProjectEndpointsQuery({
        organizationId,
        projectName,
        first: 1,
      }),
    );

    expect(firstPage.totalCount).toBe(2);
    expect(firstPage.edges).toHaveLength(1);
    expect(firstPage.pageInfo.hasNextPage).toBe(true);
    expect(firstPage.pageInfo.endCursor).toBeDefined();

    const secondPage = await runTransaction(
      new GetProjectEndpointsQuery({
        organizationId,
        projectName,
        first: 1,
        after: firstPage.pageInfo.endCursor,
      }),
    );

    expect(secondPage.totalCount).toBe(2);
    expect(secondPage.edges).toHaveLength(1);
    expect(secondPage.pageInfo.hasNextPage).toBe(false);
    expect(secondPage.edges[0].node.id).not.toBe(firstPage.edges[0].node.id);
  });

  it('should return revisionId for each endpoint', async () => {
    const { organizationId, projectName, headRevisionId, draftRevisionId } =
      await prepareProject(prismaService);

    const result = await runTransaction(
      new GetProjectEndpointsQuery({
        organizationId,
        projectName,
        first: 10,
      }),
    );

    const revisionIds = result.edges.map((edge) => edge.node.revisionId);
    expect(revisionIds).toContain(headRevisionId);
    expect(revisionIds).toContain(draftRevisionId);
  });

  it('should return empty result for project with no endpoints', async () => {
    const { organizationId, projectName, headEndpointId, draftEndpointId } =
      await prepareProject(prismaService);

    await prismaService.endpoint.deleteMany({
      where: { id: { in: [headEndpointId, draftEndpointId] } },
    });

    const result = await runTransaction(
      new GetProjectEndpointsQuery({
        organizationId,
        projectName,
        first: 10,
      }),
    );

    expect(result.totalCount).toBe(0);
    expect(result.edges).toHaveLength(0);
  });

  it('should order endpoints by revision createdAt descending', async () => {
    const { organizationId, projectName, headRevisionId, draftRevisionId } =
      await prepareProject(prismaService);

    const olderDate = new Date('2020-01-01');
    const newerDate = new Date('2025-01-01');

    await prismaService.revision.update({
      where: { id: headRevisionId },
      data: { createdAt: olderDate },
    });

    await prismaService.revision.update({
      where: { id: draftRevisionId },
      data: { createdAt: newerDate },
    });

    const result = await runTransaction(
      new GetProjectEndpointsQuery({
        organizationId,
        projectName,
        first: 10,
      }),
    );

    expect(result.edges[0].node.revisionId).toBe(draftRevisionId);
    expect(result.edges[1].node.revisionId).toBe(headRevisionId);
  });

  function runTransaction(
    query: GetProjectEndpointsQuery,
  ): Promise<GetProjectEndpointsReturnType> {
    return transactionService.run(async () => queryBus.execute(query));
  }

  let prismaService: PrismaService;
  let transactionService: TransactionPrismaService;
  let queryBus: QueryBus;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CoreModule.forRoot({ mode: 'monolith' })],
    }).compile();

    await moduleFixture.init();

    prismaService = moduleFixture.get(PrismaService);
    transactionService = moduleFixture.get(TransactionPrismaService);
    queryBus = moduleFixture.get(QueryBus);
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });
});
