import { NotFoundException } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { prepareProject } from 'src/__tests__/utils/prepareProject';
import { CoreModule } from 'src/core/core.module';
import {
  GetEndpointRelativesQuery,
  GetEndpointRelativesQueryReturnType,
} from 'src/features/endpoint/queries/impl';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

describe('GetEndpointRelativesHandler', () => {
  it('should return endpoint relatives when endpoint exists', async () => {
    const { headEndpointId, headRevisionId, branchId, projectId } =
      await prepareProject(prismaService);

    const result = await runTransaction(
      new GetEndpointRelativesQuery({ endpointId: headEndpointId }),
    );

    expect(result.endpoint.id).toBe(headEndpointId);
    expect(result.revision.id).toBe(headRevisionId);
    expect(result.revision.isDraft).toBe(false);
    expect(result.branch.id).toBe(branchId);
    expect(result.project.id).toBe(projectId);
  });

  it('should return proper structure for draft endpoint', async () => {
    const { draftEndpointId, draftRevisionId, branchId, projectId } =
      await prepareProject(prismaService);

    const result = await runTransaction(
      new GetEndpointRelativesQuery({ endpointId: draftEndpointId }),
    );

    expect(result.endpoint.id).toBe(draftEndpointId);
    expect(result.revision.id).toBe(draftRevisionId);
    expect(result.revision.isDraft).toBe(true);
    expect(result.branch.id).toBe(branchId);
    expect(result.project.id).toBe(projectId);
  });

  it('should throw NotFoundException when endpoint does not exist', async () => {
    await prepareProject(prismaService);

    const nonExistentEndpointId = 'non-existent-endpoint';

    await expect(
      runTransaction(
        new GetEndpointRelativesQuery({ endpointId: nonExistentEndpointId }),
      ),
    ).rejects.toThrow(NotFoundException);

    await expect(
      runTransaction(
        new GetEndpointRelativesQuery({ endpointId: nonExistentEndpointId }),
      ),
    ).rejects.toThrow('No endpoint found.');
  });

  it('should properly destructure nested relationships', async () => {
    const {
      headEndpointId,
      headRevisionId,
      branchId,
      projectId,
      organizationId,
      projectName,
      branchName,
    } = await prepareProject(prismaService);

    const result = await runTransaction(
      new GetEndpointRelativesQuery({ endpointId: headEndpointId }),
    );

    expect(result.endpoint).toHaveProperty('id', headEndpointId);
    expect(result.endpoint).toHaveProperty('type');
    expect(result.endpoint).not.toHaveProperty('revision');

    expect(result.revision).toHaveProperty('id', headRevisionId);
    expect(result.revision).toHaveProperty('isHead', true);
    expect(result.revision).not.toHaveProperty('branch');

    expect(result.branch).toHaveProperty('id', branchId);
    expect(result.branch).toHaveProperty('name', branchName);
    expect(result.branch).not.toHaveProperty('project');

    expect(result.project).toHaveProperty('id', projectId);
    expect(result.project).toHaveProperty('name', projectName);
    expect(result.project).toHaveProperty('organizationId', organizationId);
  });

  it('should handle different endpoint types', async () => {
    const { headEndpointId, draftEndpointId } =
      await prepareProject(prismaService);

    const headResult = await runTransaction(
      new GetEndpointRelativesQuery({ endpointId: headEndpointId }),
    );

    const draftResult = await runTransaction(
      new GetEndpointRelativesQuery({ endpointId: draftEndpointId }),
    );

    expect(headResult.endpoint.type).toBe('REST_API');
    expect(draftResult.endpoint.type).toBe('GRAPHQL');
  });

  function runTransaction(
    query: GetEndpointRelativesQuery,
  ): Promise<GetEndpointRelativesQueryReturnType> {
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
