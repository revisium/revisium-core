import { QueryBus } from '@nestjs/cqrs';
import { prepareProject } from 'src/__tests__/utils/prepareProject';
import {
  GetBranchesQuery,
  GetBranchesQueryReturnType,
} from 'src/features/branch/quieries/impl';
import { createTestingModule } from 'src/features/draft/commands/handlers/__tests__/utils';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

describe('GetBranchesHandler', () => {
  it('should get branches', async () => {
    const { organizationId, projectName } = await prepareProject(prismaService);

    const result = await runTransaction(
      new GetBranchesQuery({
        organizationId,
        projectName,
        first: 100,
      }),
    );

    expect(result.totalCount).toBe(1);
  });

  it('should not get branches if the project is deleted', async () => {
    const { organizationId, projectName, projectId } =
      await prepareProject(prismaService);

    await prismaService.project.update({
      where: { id: projectId },
      data: {
        isDeleted: true,
      },
    });

    await expect(
      runTransaction(
        new GetBranchesQuery({
          organizationId,
          projectName,
          first: 100,
        }),
      ),
    ).rejects.toThrow(
      'A project with this name does not exist in the organization',
    );
  });

  function runTransaction(
    query: GetBranchesQuery,
  ): Promise<GetBranchesQueryReturnType> {
    return transactionService.run(async () => queryBus.execute(query));
  }

  let prismaService: PrismaService;
  let transactionService: TransactionPrismaService;
  let queryBus: QueryBus;

  beforeAll(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    transactionService = result.transactionService;
    queryBus = result.queryBus;
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });
});
