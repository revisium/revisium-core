import { CommandBus } from '@nestjs/cqrs';
import { nanoid } from 'nanoid';
import {
  createTestingModule,
  prepareBranch,
} from 'src/features/draft/commands/handlers/__tests__/utils';
import { RemoveRowCommand } from 'src/features/draft/commands/impl/remove-row.command';
import { RemoveRowHandlerReturnType } from 'src/features/draft/commands/types/remove-row.handler.types';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { JsonSchemaTypeName } from 'src/features/share/utils/schema/types/schema.types';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

describe('RemoveRowHandler', () => {
  it('should throw an error if the revision does not exist', async () => {
    const { tableId, rowId } = await prepareBranch(prismaService);

    const command = new RemoveRowCommand({
      revisionId: 'unreal',
      tableId,
      rowId,
    });

    await expect(runTransaction(command)).rejects.toThrow('Revision not found');
  });

  it('should throw an error if findRowInTableOrThrow fails', async () => {
    const { draftRevisionId, tableId } = await prepareBranch(prismaService);

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
    const { draftRevisionId, rowId } = await prepareBranch(prismaService);

    const command = new RemoveRowCommand({
      revisionId: draftRevisionId,
      tableId: SystemTables.Schema,
      rowId,
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'Table is a system table',
    );
  });

  it('should throw an error if the reference exists', async () => {
    const { draftRevisionId, schemaTableVersionId, tableId, rowId } =
      await prepareBranch(prismaService);
    const anotherTableId = nanoid();
    const anotherTableVersionId = nanoid();
    const anotherRowId = nanoid();
    const anotherRowVersionId = nanoid();

    // table
    await prismaService.table.create({
      data: {
        id: anotherTableId,
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
              reference: tableId,
              default: '',
            },
          },
          required: ['ref'],
        },
      },
    });
    // row for another table
    await prismaService.row.create({
      data: {
        id: anotherRowId,
        readonly: false,
        versionId: anotherRowVersionId,
        tables: {
          connect: {
            versionId: anotherTableVersionId,
          },
        },
        data: {
          ref: rowId,
        },
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
    const { draftRevisionId, branchId, tableId, draftTableVersionId, rowId } =
      await prepareBranch(prismaService);

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
  });

  it('should remove the row if conditions are met and if the table is a system table and skipCheckingNotSystemTable = true', async () => {
    const { draftRevisionId, tableId } = await prepareBranch(prismaService);

    const command = new RemoveRowCommand({
      revisionId: draftRevisionId,
      tableId: SystemTables.Schema,
      avoidCheckingSystemTable: true,
      rowId: tableId,
    });

    const result = await runTransaction(command);

    expect(result).toBeTruthy();
  });

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
