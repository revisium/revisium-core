import { QueryBus } from '@nestjs/cqrs';
import {
  createPreviousFile,
  prepareProject,
  prepareRow,
  prepareTableWithSchema,
} from 'src/__tests__/utils/prepareProject';
import {
  getArraySchema,
  getObjectSchema,
  getRefSchema,
} from 'src/__tests__/utils/schema/schema.mocks';
import { createTestingModule } from 'src/features/draft/commands/handlers/__tests__/utils';
import { FileStatus } from 'src/features/plugin/file.plugin';
import { GetRowsQuery } from 'src/features/row/queries/impl';
import { GetRowsReturnType } from 'src/features/row/queries/types';
import { SystemSchemaIds } from 'src/features/share/schema-ids.consts';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

describe('getRows', () => {
  it('should compute rows', async () => {
    const { headRevisionId, draftRevisionId, schemaTableVersionId } =
      await prepareProject(prismaService);

    const table = await prepareTableWithSchema({
      prismaService,
      headRevisionId,
      draftRevisionId,
      schemaTableVersionId,
      schema: getObjectSchema({
        file: getRefSchema(SystemSchemaIds.File),
        files: getArraySchema(getRefSchema(SystemSchemaIds.File)),
      }),
    });

    const data = {
      file: {
        ...createPreviousFile(),
        status: FileStatus.uploaded,
        url: '',
      },
      files: [],
    };

    await prepareRow({
      prismaService,
      headTableVersionId: table.headTableVersionId,
      draftTableVersionId: table.draftTableVersionId,
      schema: table.schema,
      data: data,
      dataDraft: data,
    });

    const result = await runTransaction(
      new GetRowsQuery({
        revisionId: draftRevisionId,
        tableId: table.tableId,
        first: 1,
      }),
    );

    const resultData = result.edges[0].node.data as typeof data;

    expect(resultData.file.url).toBeTruthy();
  });

  function runTransaction(query: GetRowsQuery): Promise<GetRowsReturnType> {
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
