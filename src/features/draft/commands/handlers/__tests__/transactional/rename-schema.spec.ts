import { CommandBus } from '@nestjs/cqrs';
import { prepareProject } from 'src/__tests__/utils/prepareProject';
import {
  createTestingModule,
  getTestLinkedSchema,
} from 'src/features/draft/commands/handlers/__tests__/utils';
import {
  RenameSchemaCommand,
  RenameSchemaCommandReturnType,
} from 'src/features/draft/commands/impl/transactional/rename-schema.command';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

describe('RenameSchemaHandler', () => {
  const nextTableId = 'nextTableId';

  it('should rename the schema if conditions are met', async () => {
    const ids = await prepareProject(prismaService);
    const { draftRevisionId, tableId } = ids;

    const command = new RenameSchemaCommand({
      revisionId: draftRevisionId,
      tableId,
      nextTableId,
    });

    const result = await runTransaction(command);
    expect(result).toBe(true);

    const oldSchemaRow = await prismaService.row.findFirst({
      where: {
        id: tableId,
        tables: {
          some: {
            id: SystemTables.Schema,
            revisions: {
              some: {
                id: draftRevisionId,
              },
            },
          },
        },
      },
    });
    expect(oldSchemaRow).toBeNull();

    const newSchemaRow = await prismaService.row.findFirst({
      where: {
        id: nextTableId,
        tables: {
          some: {
            id: SystemTables.Schema,
            revisions: {
              some: {
                id: draftRevisionId,
              },
            },
          },
        },
      },
    });
    expect(newSchemaRow).not.toBeNull();
  });

  it('should update the linked table', async () => {
    const ids = await prepareProject(prismaService, {
      createLinkedTable: true,
    });
    const { draftRevisionId, tableId, linkedTable } = ids;

    const command = new RenameSchemaCommand({
      revisionId: draftRevisionId,
      tableId,
      nextTableId,
    });

    const result = await runTransaction(command);
    expect(result).toBe(true);

    const schemaRow = await prismaService.row.findFirstOrThrow({
      where: {
        id: linkedTable?.tableId,
        tables: {
          some: {
            id: SystemTables.Schema,
            revisions: {
              some: {
                id: draftRevisionId,
              },
            },
          },
        },
      },
    });

    expect(schemaRow.data).toStrictEqual(getTestLinkedSchema(nextTableId));
  });

  function runTransaction(
    command: RenameSchemaCommand,
  ): Promise<RenameSchemaCommandReturnType> {
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
