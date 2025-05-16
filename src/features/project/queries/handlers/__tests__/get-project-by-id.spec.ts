import { QueryBus } from '@nestjs/cqrs';
import { prepareProject } from 'src/__tests__/utils/prepareProject';
import { createTestingModule } from 'src/features/draft/commands/handlers/__tests__/utils';
import {
  GetProjectByIdQuery,
  GetProjectByIdQueryReturnType,
} from 'src/features/project/queries/impl';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

describe('GetProjectByIdHandler', () => {
  it('should get project', async () => {
    const { projectId } = await prepareProject(prismaService);

    const result = await runTransaction(
      new GetProjectByIdQuery({
        projectId,
      }),
    );

    expect(result).toBeTruthy();
  });

  it('should not get project if the project is deleted', async () => {
    const { projectId } = await prepareProject(prismaService);

    await prismaService.project.update({
      where: { id: projectId },
      data: {
        isDeleted: true,
      },
    });

    await expect(
      runTransaction(
        new GetProjectByIdQuery({
          projectId,
        }),
      ),
    ).rejects.toThrow(
      'A project with this name does not exist in the organization',
    );
  });

  function runTransaction(
    query: GetProjectByIdQuery,
  ): Promise<GetProjectByIdQueryReturnType> {
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
