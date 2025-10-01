import { CommandBus } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import { nanoid } from 'nanoid';
import * as objectHash from 'object-hash';
import { prepareProject } from 'src/__tests__/utils/prepareProject';
import { createTestingModule } from 'src/features/draft/commands/handlers/__tests__/utils';
import { RemoveTableCommand } from 'src/features/draft/commands/impl/remove-table.command';
import { RemoveTableHandlerReturnType } from 'src/features/draft/commands/types/remove-table.handler.types';
import { tableMigrationsSchema } from 'src/features/share/schema/table-migrations-schema';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { InitMigration, RemoveMigration } from '@revisium/schema-toolkit/types';
import { JsonSchemaTypeName } from '@revisium/schema-toolkit/types';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

describe('RemoveTableHandler', () => {
  it('should throw an error if the revision does not exist', async () => {
    const { tableId } = await prepareProject(prismaService);

    const command = new RemoveTableCommand({
      revisionId: 'unreal',
      tableId,
    });

    await expect(runTransaction(command)).rejects.toThrow('Revision not found');
  });

  it('should throw an error if findTableInRevisionOrThrow fails', async () => {
    const { draftRevisionId } = await prepareProject(prismaService);

    const command = new RemoveTableCommand({
      revisionId: draftRevisionId,
      tableId: 'unreal',
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'A table with this name does not exist in the revision',
    );
  });

  it('should throw an error if the table is a system table', async () => {
    const { draftRevisionId } = await prepareProject(prismaService);

    const command = new RemoveTableCommand({
      revisionId: draftRevisionId,
      tableId: SystemTables.Schema,
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'Table is a system table',
    );
  });

  it('should throw an error if the foreign keys exists', async () => {
    const { draftRevisionId, schemaTableVersionId, tableId } =
      await prepareProject(prismaService);
    const anotherTableId = nanoid();
    const anotherTableVersionId = nanoid();

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
    const data = {
      type: JsonSchemaTypeName.Object,
      properties: {
        ref: {
          type: JsonSchemaTypeName.String,
          foreignKey: tableId,
          default: '',
        },
      },
    };
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
        data,
        hash: '',
        schemaHash: '',
      },
    });

    const command = new RemoveTableCommand({
      revisionId: draftRevisionId,
      tableId,
    });

    await expect(runTransaction(command)).rejects.toThrow(
      `There are foreign keys between ${tableId} and [${anotherTableId}]`,
    );
  });

  it('should remove the table if conditions are met', async () => {
    const { draftRevisionId, branchId, tableId } =
      await prepareProject(prismaService);

    const command = new RemoveTableCommand({
      revisionId: draftRevisionId,
      tableId,
    });

    const result = await runTransaction(command);

    expect(result.revisionId).toBe(draftRevisionId);
    expect(result.branchId).toBe(branchId);

    const schemaForTable = await prismaService.row.findFirst({
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
    expect(schemaForTable).toBeNull();

    const revision = await prismaService.revision.findUniqueOrThrow({
      where: { id: draftRevisionId },
    });
    expect(revision.hasChanges).toBe(true);
    await migrationCheck({
      revisionId: draftRevisionId,
      tableId,
    });
  });

  xit('should set hasChanges as false if conditions are met', async () => {
    // need to remove init and others migrations for this table
    const {
      draftRevisionId,
      tableId,
      createdIdForTableInSchemaTable,
      headTableVersionId,
      schemaTableCreatedId,
      schemaTableVersionId,
    } = await prepareProject(prismaService);
    await prismaService.table.delete({
      where: {
        versionId: headTableVersionId,
      },
    });
    // draft schema table
    await prismaService.table.update({
      where: {
        versionId: schemaTableVersionId,
      },
      data: {
        revisions: {
          disconnect: {
            id: draftRevisionId,
          },
        },
      },
    });
    await prismaService.row.deleteMany({
      where: {
        tables: {
          some: {
            versionId: schemaTableVersionId,
          },
        },
      },
    });
    const draftSchemaTable = await prismaService.table.create({
      data: {
        id: SystemTables.Schema,
        createdId: schemaTableCreatedId,
        versionId: nanoid(),
        readonly: false,
        revisions: {
          connect: {
            id: draftRevisionId,
          },
        },
      },
    });
    // row in schema table
    await prismaService.row.create({
      data: {
        id: tableId,
        versionId: nanoid(),
        createdId: createdIdForTableInSchemaTable,
        data: {},
        meta: {},
        hash: '',
        schemaHash: '',
        readonly: false,
        tables: {
          connect: {
            versionId: draftSchemaTable.versionId,
          },
        },
      },
    });

    const command = new RemoveTableCommand({
      revisionId: draftRevisionId,
      tableId,
    });

    await runTransaction(command);

    const revision = await prismaService.revision.findUniqueOrThrow({
      where: { id: draftRevisionId },
    });
    expect(revision.hasChanges).toBe(false);
  });

  it('should set hasChanges as true if table is readonly', async () => {
    const {
      draftRevisionId,
      tableId,
      headTableVersionId,
      draftTableVersionId,
    } = await prepareProject(prismaService);
    await prismaService.revision.update({
      where: {
        id: draftRevisionId,
      },
      data: {
        hasChanges: false,
      },
    });
    await prismaService.table.delete({
      where: {
        versionId: draftTableVersionId,
      },
    });
    await prismaService.table.update({
      where: {
        versionId: headTableVersionId,
      },
      data: {
        revisions: {
          connect: {
            id: draftRevisionId,
          },
        },
      },
    });

    const command = new RemoveTableCommand({
      revisionId: draftRevisionId,
      tableId,
    });

    await runTransaction(command);

    const revision = await prismaService.revision.findUniqueOrThrow({
      where: { id: draftRevisionId },
    });
    expect(revision.hasChanges).toBe(true);
  });

  it('should not set hasChanges as false if conditions are not met', async () => {
    const { draftRevisionId, tableId, headTableVersionId } =
      await prepareProject(prismaService);
    await prismaService.table.delete({
      where: {
        versionId: headTableVersionId,
      },
    });
    await prismaService.table.create({
      data: {
        id: nanoid(),
        createdId: nanoid(),
        versionId: nanoid(),
        readonly: false,
        revisions: {
          connect: {
            id: draftRevisionId,
          },
        },
      },
    });

    const command = new RemoveTableCommand({
      revisionId: draftRevisionId,
      tableId,
    });

    await runTransaction(command);

    const revision = await prismaService.revision.findUniqueOrThrow({
      where: { id: draftRevisionId },
    });
    expect(revision.hasChanges).toBe(true);
  });

  it('should disconnect the table if the table is readonly', async () => {
    const { draftRevisionId, tableId, draftTableVersionId } =
      await prepareProject(prismaService);
    await prismaService.table.update({
      where: {
        versionId: draftTableVersionId,
      },
      data: {
        readonly: true,
      },
    });

    const command = new RemoveTableCommand({
      revisionId: draftRevisionId,
      tableId,
    });

    await runTransaction(command);

    const table = await prismaService.table.findUnique({
      where: { versionId: draftTableVersionId },
    });
    expect(table).toBeTruthy();
  });

  it('should remove the table if the table is not readonly', async () => {
    const { draftRevisionId, tableId, draftTableVersionId } =
      await prepareProject(prismaService);
    await prismaService.table.update({
      where: {
        versionId: draftTableVersionId,
      },
      data: {
        readonly: false,
      },
    });

    const command = new RemoveTableCommand({
      revisionId: draftRevisionId,
      tableId,
    });

    await runTransaction(command);

    const table = await prismaService.table.findUnique({
      where: { versionId: draftTableVersionId },
    });
    expect(table).toBeNull();
  });

  async function migrationCheck({
    revisionId,
    tableId,
  }: {
    revisionId: string;
    tableId: string;
  }) {
    const rows = await prismaService.row.findMany({
      where: {
        data: {
          path: ['tableId'],
          equals: tableId,
        },
        tables: {
          some: {
            id: SystemTables.Migration,
            revisions: {
              some: {
                id: revisionId,
              },
            },
          },
        },
      },
      orderBy: {
        id: Prisma.SortOrder.desc,
      },
    });

    expect(rows.length).toBe(2);

    const rowInit = rows[1];
    const dataInit = rowInit.data as InitMigration;
    expect(dataInit.changeType).toBe('init');

    const rowRename = rows[0];

    const data = rowRename.data as RemoveMigration;
    expect(rowRename.id).toBe(data.id);
    expect(rowRename.meta).toStrictEqual({});
    expect(rowRename.hash).toBe(objectHash(data));
    expect(rowRename.schemaHash).toBe(objectHash(tableMigrationsSchema));
    expect(data.changeType).toBe('remove');
    expect(data.tableId).toBe(tableId);
  }

  function runTransaction(
    command: RemoveTableCommand,
  ): Promise<RemoveTableHandlerReturnType> {
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
