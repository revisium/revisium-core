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
    const previousSchemaRow = await prismaService.row.findFirstOrThrow({
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

    const command = new RenameSchemaCommand({
      revisionId: draftRevisionId,
      tableId,
      nextTableId,
    });

    const result = await runTransaction(command);

    const schemaRow = await prismaService.row.findFirstOrThrow({
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
    expect(result).toBe(true);
    expect(schemaRow.versionId).not.toBe(previousSchemaRow.versionId);
    expect(schemaRow.createdId).toBe(previousSchemaRow.createdId);
    expect(schemaRow.id).not.toBe(previousSchemaRow.id);
  });

  it('should updated the linked table', async () => {
    const ids = await prepareProject(prismaService, {
      createLinkedTable: true,
    });
    const { headRevisionId, draftRevisionId, tableId, linkedTable } = ids;

    const previousSchemaRow = await prismaService.row.findFirstOrThrow({
      where: {
        id: linkedTable?.tableId,
        tables: {
          some: {
            id: SystemTables.Schema,
            revisions: {
              some: {
                id: headRevisionId,
              },
            },
          },
        },
      },
    });

    const command = new RenameSchemaCommand({
      revisionId: draftRevisionId,
      tableId,
      nextTableId,
    });

    const result = await runTransaction(command);

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

    expect(result).toBe(true);
    expect(previousSchemaRow.data).toStrictEqual(getTestLinkedSchema(tableId));
    expect(schemaRow.data).toStrictEqual(getTestLinkedSchema(nextTableId));
    expect(previousSchemaRow.versionId).not.toBe(schemaRow.versionId);
  });

  function runTransaction(
    command: RenameSchemaCommand,
  ): Promise<RenameSchemaCommandReturnType> {
    return transactionService.run(async () => commandBus.execute(command));
  }

  let prismaService: PrismaService;
  let commandBus: CommandBus;
  let transactionService: TransactionPrismaService;

  beforeEach(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    commandBus = result.commandBus;
    transactionService = result.transactionService;
  });

  afterEach(async () => {
    await prismaService.$disconnect();
  });
});
