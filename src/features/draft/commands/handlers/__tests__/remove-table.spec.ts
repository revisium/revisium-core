import { CommandBus } from '@nestjs/cqrs';
import { nanoid } from 'nanoid';
import { prepareProject } from 'src/__tests__/utils/prepareProject';
import { createTestingModule } from 'src/features/draft/commands/handlers/__tests__/utils';
import { RemoveTableCommand } from 'src/features/draft/commands/impl/remove-table.command';
import { RemoveTableHandlerReturnType } from 'src/features/draft/commands/types/remove-table.handler.types';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { TableApiService } from 'src/features/table/table-api.service';
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
    const { draftRevisionId, tableId } = await prepareProject(prismaService);

    const command = new RemoveTableCommand({
      revisionId: draftRevisionId,
      tableId,
    });

    const result = await runTransaction(command);
    expect(result.revisionId).toBe(draftRevisionId);

    const table = await tableApiService.getTable({
      revisionId: draftRevisionId,
      tableId,
    });
    expect(table).toBeNull();
  });

  describe('views integration', () => {
    it('should remove views row when removing table that has views configured', async () => {
      const { draftRevisionId, tableId } = await prepareProject(prismaService);

      const viewsTableVersionId = nanoid();
      await prismaService.table.create({
        data: {
          id: SystemTables.Views,
          versionId: viewsTableVersionId,
          createdId: nanoid(),
          readonly: false,
          system: true,
          revisions: {
            connect: { id: draftRevisionId },
          },
        },
      });

      await prismaService.row.create({
        data: {
          id: tableId,
          versionId: nanoid(),
          createdId: nanoid(),
          readonly: false,
          data: {
            version: 1,
            defaultViewId: 'default',
            views: [{ id: 'default', name: 'Default' }],
          },
          hash: '',
          schemaHash: '',
          tables: {
            connect: { versionId: viewsTableVersionId },
          },
        },
      });

      const viewsRowBefore = await prismaService.row.findFirst({
        where: {
          id: tableId,
          tables: { some: { versionId: viewsTableVersionId } },
        },
      });
      expect(viewsRowBefore).not.toBeNull();

      const command = new RemoveTableCommand({
        revisionId: draftRevisionId,
        tableId,
      });
      await runTransaction(command);

      const viewsRowAfter = await prismaService.row.findFirst({
        where: {
          id: tableId,
          tables: { some: { versionId: viewsTableVersionId } },
        },
      });
      expect(viewsRowAfter).toBeNull();
    });

    it('should not fail when removing table without views', async () => {
      const { draftRevisionId, tableId } = await prepareProject(prismaService);

      const command = new RemoveTableCommand({
        revisionId: draftRevisionId,
        tableId,
      });

      await expect(runTransaction(command)).resolves.toBeDefined();
    });

    it('should not fail when views table exists but no views row for table', async () => {
      const { draftRevisionId, tableId } = await prepareProject(prismaService);

      await prismaService.table.create({
        data: {
          id: SystemTables.Views,
          versionId: nanoid(),
          createdId: nanoid(),
          readonly: false,
          system: true,
          revisions: {
            connect: { id: draftRevisionId },
          },
        },
      });

      const command = new RemoveTableCommand({
        revisionId: draftRevisionId,
        tableId,
      });

      await expect(runTransaction(command)).resolves.toBeDefined();
    });
  });

  function runTransaction(
    command: RemoveTableCommand,
  ): Promise<RemoveTableHandlerReturnType> {
    return transactionService.run(async () => commandBus.execute(command));
  }

  let prismaService: PrismaService;
  let commandBus: CommandBus;
  let transactionService: TransactionPrismaService;
  let tableApiService: TableApiService;

  beforeAll(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    commandBus = result.commandBus;
    transactionService = result.transactionService;
    tableApiService = result.module.get<TableApiService>(TableApiService);
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });
});
