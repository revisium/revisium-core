import { CommandBus } from '@nestjs/cqrs';
import { nanoid } from 'nanoid';
import {
  prepareProject,
  PrepareProjectReturnType,
} from 'src/__tests__/utils/prepareProject';
import { createTestingModule } from 'src/features/draft/commands/handlers/__tests__/utils';
import { RemoveRowCommand } from 'src/features/draft/commands/impl/remove-row.command';
import { RemoveRowHandlerReturnType } from 'src/features/draft/commands/types/remove-row.handler.types';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { JsonSchemaTypeName } from 'src/features/share/utils/schema/types/schema.types';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

describe('RemoveRowHandler', () => {
  it('should throw an error if the revision does not exist', async () => {
    const { tableId, rowId } = await prepareProject(prismaService);

    const command = new RemoveRowCommand({
      revisionId: 'unreal',
      tableId,
      rowId,
    });

    await expect(runTransaction(command)).rejects.toThrow('Revision not found');
  });

  it('should throw an error if findRowInTableOrThrow fails', async () => {
    const { draftRevisionId, tableId } = await prepareProject(prismaService);

    const command = new RemoveRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId: 'unreal',
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'A row with this name does not exist in the revision',
    );
  });

  it('should throw an error if the table is a system table', async () => {
    const { draftRevisionId, rowId } = await prepareProject(prismaService);

    const command = new RemoveRowCommand({
      revisionId: draftRevisionId,
      tableId: SystemTables.Schema,
      rowId,
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'Table is a system table',
    );
  });

  it('should throw an error if the foreignKey exists', async () => {
    const { draftRevisionId, schemaTableVersionId, tableId, rowId } =
      await prepareProject(prismaService);
    const anotherTableId = nanoid();
    const anotherTableVersionId = nanoid();
    const anotherRowId = nanoid();
    const anotherRowVersionId = nanoid();

    // table
    await prismaService.table.create({
      data: {
        id: anotherTableId,
        createdId: nanoid(),
        readonly: false,
        versionId: anotherTableVersionId,
        revisions: {
          connect: {
            id: draftRevisionId,
          },
        },
      },
    });
    // schema for table
    await prismaService.row.create({
      data: {
        id: anotherTableId,
        readonly: false,
        createdId: nanoid(),
        versionId: nanoid(),
        tables: {
          connect: {
            versionId: schemaTableVersionId,
          },
        },
        data: {
          type: JsonSchemaTypeName.Object,
          properties: {
            ref: {
              type: JsonSchemaTypeName.String,
              foreignKey: tableId,
              default: '',
            },
          },
          required: ['ref'],
        },
        hash: '',
        schemaHash: '',
      },
    });
    // row for another table
    await prismaService.row.create({
      data: {
        id: anotherRowId,
        readonly: false,
        createdId: nanoid(),
        versionId: anotherRowVersionId,
        tables: {
          connect: {
            versionId: anotherTableVersionId,
          },
        },
        data: {
          ref: rowId,
        },
        hash: '',
        schemaHash: '',
      },
    });

    const command = new RemoveRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'The row is related to other rows',
    );
  });

  it('should remove the row if conditions are met', async () => {
    const ids = await prepareProject(prismaService);
    const { draftRevisionId, branchId, tableId, draftTableVersionId, rowId } =
      ids;

    const command = new RemoveRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
    });

    const result = await runTransaction(command);

    expect(result.branchId).toBe(branchId);
    expect(result.tableVersionId).toBe(draftTableVersionId);
    expect(result.previousTableVersionId).toBe(draftTableVersionId);

    const row = await prismaService.row.findFirst({
      where: {
        id: rowId,
        tables: {
          some: {
            id: tableId,
            revisions: {
              some: {
                id: draftRevisionId,
              },
            },
          },
        },
      },
    });
    expect(row).toBeNull();

    await checkRevision(ids, true);
  });

  it('should set hasChanges as false if conditions are met', async () => {
    const ids = await prepareProject(prismaService);
    const { draftRevisionId, tableId, rowId, headRowVersionId } = ids;
    await prismaService.revision.update({
      where: {
        id: draftRevisionId,
      },
      data: {
        hasChanges: true,
      },
    });
    await prismaService.row.delete({
      where: {
        versionId: headRowVersionId,
      },
    });

    const command = new RemoveRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
    });

    await runTransaction(command);
    await checkRevision(ids, false);
  });

  it('should not set hasChanges as false if there is another draft row', async () => {
    const ids = await prepareProject(prismaService);
    const {
      draftRevisionId,
      tableId,
      rowId,
      headRowVersionId,
      draftTableVersionId,
    } = ids;
    await prismaService.revision.update({
      where: {
        id: draftRevisionId,
      },
      data: {
        hasChanges: true,
      },
    });
    await prismaService.row.delete({
      where: {
        versionId: headRowVersionId,
      },
    });
    await prismaService.row.create({
      data: {
        id: nanoid(),
        versionId: nanoid(),
        createdId: nanoid(),
        data: {},
        hash: '',
        schemaHash: '',
        tables: {
          connect: {
            versionId: draftTableVersionId,
          },
        },
      },
    });

    const command = new RemoveRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
    });

    await runTransaction(command);
    await checkRevision(ids, true);
  });

  it('should remove the row if conditions are met and if the table is a system table and skipCheckingNotSystemTable = true', async () => {
    const { draftRevisionId, tableId } = await prepareProject(prismaService);

    const command = new RemoveRowCommand({
      revisionId: draftRevisionId,
      tableId: SystemTables.Schema,
      avoidCheckingSystemTable: true,
      rowId: tableId,
    });

    const result = await runTransaction(command);

    expect(result).toBeTruthy();
  });

  it('should remove the row in a new created table if conditions are met', async () => {
    const ids = await prepareProject(prismaService);
    const { draftRevisionId, tableId, rowId, draftTableVersionId } = ids;
    await prismaService.table.update({
      where: {
        versionId: draftTableVersionId,
      },
      data: {
        readonly: true,
      },
    });

    const command = new RemoveRowCommand({
      revisionId: draftRevisionId,
      tableId,
      rowId,
    });

    const result = await runTransaction(command);

    expect(result.previousTableVersionId).toBe(draftTableVersionId);
    expect(result.tableVersionId).not.toBe(draftTableVersionId);

    await checkRevision(ids, true);
  });

  async function checkRevision(
    ids: PrepareProjectReturnType,
    hasChanges: boolean,
  ) {
    const { draftRevisionId } = ids;

    const revision = await prismaService.revision.findFirstOrThrow({
      where: { id: draftRevisionId },
    });
    expect(revision.hasChanges).toBe(hasChanges);
  }

  function runTransaction(
    command: RemoveRowCommand,
  ): Promise<RemoveRowHandlerReturnType> {
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
