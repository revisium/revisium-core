import { CommandBus } from '@nestjs/cqrs';
import { nanoid } from 'nanoid';
import hash from 'object-hash';
import {
  prepareBranch,
  prepareTableWithSchema,
} from 'src/__tests__/utils/prepareProject';
import { testSchema } from 'src/features/draft/commands/handlers/__tests__/utils';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { createTestingModule } from 'src/features/draft/commands/handlers/__tests__/utils';
import { UpdateRowsCommand } from 'src/features/draft/commands/impl/update-rows.command';

/**
 * Tests for concurrent update behavior with SERIALIZABLE isolation level.
 *
 * Problem: When multiple parallel requests update different rows in the same
 * readonly table, each request triggers copy-on-write creating a new table version.
 * With READ COMMITTED isolation, all requests succeed but create multiple table
 * versions connected to the same revision - data corruption.
 *
 * Solution: Use runSerializable() which uses SERIALIZABLE isolation level
 * with automatic retry on serialization failures.
 */
describe('Concurrent UpdateRow', () => {
  it('should prevent race condition with runSerializable()', async () => {
    // Setup: create a readonly table with multiple rows
    const branchData = await prepareBranch(prismaService);
    const {
      headRevisionId,
      draftRevisionId,
      schemaTableVersionId,
      migrationTableVersionId,
    } = branchData;

    const tableData = await prepareTableWithSchema({
      prismaService,
      headRevisionId,
      draftRevisionId,
      schemaTableVersionId,
      migrationTableVersionId,
      schema: testSchema,
    });

    const { tableId, draftTableVersionId } = tableData;

    // Create 5 rows
    const rowCount = 5;
    const rowIds: string[] = [];

    for (let i = 0; i < rowCount; i++) {
      const rowId = `row-${nanoid()}`;
      rowIds.push(rowId);

      await prismaService.row.create({
        data: {
          id: rowId,
          versionId: nanoid(),
          createdId: nanoid(),
          data: { ver: i },
          hash: hash({ ver: i }),
          schemaHash: hash(testSchema),
          readonly: false,
          tables: { connect: { versionId: draftTableVersionId } },
        },
      });
    }

    // Make table and rows readonly to trigger copy-on-write
    await prismaService.table.update({
      where: { versionId: draftTableVersionId },
      data: { readonly: true },
    });

    await prismaService.row.updateMany({
      where: { id: { in: rowIds } },
      data: { readonly: true },
    });

    // Create commands for all rows
    const commands = rowIds.map(
      (rowId, i) =>
        new UpdateRowsCommand({
          revisionId: draftRevisionId,
          tableId,
          rows: [{ rowId, data: { ver: 1000 + i } }],
        }),
    );

    // Execute ALL updates in parallel using runSerializable
    const results = await Promise.allSettled(
      commands.map((cmd) =>
        transactionService.runSerializable(async () => commandBus.execute(cmd)),
      ),
    );

    const fulfilled = results.filter((r) => r.status === 'fulfilled').length;

    // Check final state - should have exactly ONE table connected to revision
    const tablesAfter = await prismaService.table.findMany({
      where: {
        id: tableId,
        revisions: { some: { id: draftRevisionId } },
      },
    });

    // With runSerializable, all should eventually succeed (with retries)
    // and only ONE table version should be connected to revision
    expect(tablesAfter.length).toBe(1);
    expect(fulfilled).toBeGreaterThanOrEqual(rowCount - 1);
  });

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
