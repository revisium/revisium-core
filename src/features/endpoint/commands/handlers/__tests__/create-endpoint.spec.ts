import { CommandBus } from '@nestjs/cqrs';
import { EndpointType } from '@prisma/client';
import { prepareProject } from 'src/__tests__/utils/prepareProject';
import { createTestingModule } from 'src/features/draft/commands/handlers/__tests__/utils';
import {
  CreateEndpointCommand,
  CreateEndpointCommandReturnType,
} from 'src/features/endpoint/commands/impl';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

describe('CreateEndpointHandler', () => {
  it('already exist', async () => {
    const { draftRevisionId } = await prepareProject(prismaService);

    await expect(
      runTransaction(
        new CreateEndpointCommand({
          revisionId: draftRevisionId,
          type: EndpointType.GRAPHQL,
        }),
      ),
    ).rejects.toThrow('Endpoint already has been created');
  });

  it('create endpoint', async () => {
    const { draftRevisionId, draftEndpointId } =
      await prepareProject(prismaService);

    await prismaService.endpoint.deleteMany({
      where: {
        revisionId: draftRevisionId,
      },
    });

    const result = await runTransaction(
      new CreateEndpointCommand({
        revisionId: draftRevisionId,
        type: EndpointType.GRAPHQL,
      }),
    );

    const endpoint = await prismaService.endpoint.findFirstOrThrow({
      where: { revisionId: draftRevisionId },
    });

    expect(result).not.toBe(draftEndpointId);
    expect(endpoint.isDeleted).toBe(false);
    expect(endpoint.type).toBe(EndpointType.GRAPHQL);
    expect(endpoint.versionId).toBe('GRAPHQL-1');
    expect(endpoint.versionId).toBe('GRAPHQL-1');
  });

  it('restore endpoint', async () => {
    const { draftRevisionId, draftEndpointId } =
      await prepareProject(prismaService);

    const date = new Date('2025-01-01T00:00:00Z');

    await prismaService.endpoint.update({
      where: {
        id: draftEndpointId,
      },
      data: {
        isDeleted: true,
        createdAt: date,
        type: EndpointType.GRAPHQL,
      },
    });

    const result = await runTransaction(
      new CreateEndpointCommand({
        revisionId: draftRevisionId,
        type: EndpointType.GRAPHQL,
      }),
    );

    const endpoint = await prismaService.endpoint.findUniqueOrThrow({
      where: { id: draftEndpointId },
    });

    expect(result).toBe(draftEndpointId);
    expect(endpoint.isDeleted).toBe(false);
    expect(endpoint.type).toBe(EndpointType.GRAPHQL);
    expect(endpoint.versionId).toBe('GRAPHQL-1');
    expect(endpoint.createdAt.toISOString()).not.toBe(date.toISOString());
  });

  function runTransaction(
    command: CreateEndpointCommand,
  ): Promise<CreateEndpointCommandReturnType> {
    return transactionService.run(async () => commandBus.execute(command));
  }

  let prismaService: PrismaService;
  let commandBus: CommandBus;
  let transactionService: TransactionPrismaService;

  beforeAll(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    commandBus = result.commandBus;
    transactionService = result.transactionService;
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });
});
