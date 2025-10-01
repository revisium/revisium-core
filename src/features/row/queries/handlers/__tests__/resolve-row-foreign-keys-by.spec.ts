import { QueryBus } from '@nestjs/cqrs';
import {
  createPreviousFile,
  prepareBranch,
  prepareRow,
  prepareTableWithSchema,
} from 'src/__tests__/utils/prepareProject';
import {
  getObjectSchema,
  getRefSchema,
  getStringSchema,
} from '@revisium/schema-toolkit/mocks';
import { createTestingModule } from 'src/features/draft/commands/handlers/__tests__/utils';
import { FileStatus } from 'src/features/plugin/file/consts';
import {
  ResolveRowForeignKeysByQuery,
  ResolveRowForeignKeysByReturnType,
} from 'src/features/row/queries/impl';
import { SystemSchemaIds } from '@revisium/schema-toolkit/consts';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

describe('ResolveRowForeignKeysByHandler', () => {
  it('should compute rows', async () => {
    const {
      headRevisionId,
      draftRevisionId,
      schemaTableVersionId,
      migrationTableVersionId,
    } = await prepareBranch(prismaService);

    const table = await prepareTableWithSchema({
      prismaService,
      headRevisionId,
      draftRevisionId,
      schemaTableVersionId,
      migrationTableVersionId,
      schema: getObjectSchema({
        title: getStringSchema(),
      }),
    });

    const byTable = await prepareTableWithSchema({
      prismaService,
      headRevisionId,
      draftRevisionId,
      schemaTableVersionId,
      migrationTableVersionId,
      schema: getObjectSchema({
        file: getRefSchema(SystemSchemaIds.File),
        link: getStringSchema({
          foreignKey: table.tableId,
        }),
      }),
    });

    const row = await prepareRow({
      prismaService,
      headTableVersionId: table.headTableVersionId,
      draftTableVersionId: table.draftTableVersionId,
      schema: table.schema,
      data: { title: 'title' },
      dataDraft: { title: 'title' },
    });

    const data = {
      file: {
        ...createPreviousFile(),
        status: FileStatus.uploaded,
        url: '',
      },
      link: row.rowId,
    };

    await prepareRow({
      prismaService,
      headTableVersionId: byTable.headTableVersionId,
      draftTableVersionId: byTable.draftTableVersionId,
      schema: table.schema,
      data: data,
      dataDraft: data,
    });

    const result = await runTransaction(
      new ResolveRowForeignKeysByQuery({
        revisionId: draftRevisionId,
        tableId: table.tableId,
        rowId: row.rowId,
        first: 100,
        foreignKeyByTableId: byTable.tableId,
      }),
    );

    expect(result.totalCount).toEqual(1);

    const resultData = result.edges[0].node.data as typeof data;
    expect(resultData.file.url).toBeTruthy();
  });

  function runTransaction(
    query: ResolveRowForeignKeysByQuery,
  ): Promise<ResolveRowForeignKeysByReturnType> {
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
