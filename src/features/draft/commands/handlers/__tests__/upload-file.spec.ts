import { CommandBus } from '@nestjs/cqrs';
import { nanoid } from 'nanoid';
import * as hash from 'object-hash';
import { createExpressImageFile } from 'src/__tests__/utils/file';
import {
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
import {
  UploadFileCommand,
  UploadFileCommandReturnType,
} from 'src/features/draft/commands/impl/update-file.command';
import { FileStatus } from 'src/features/plugin/file/file.plugin';
import { SystemSchemaIds } from 'src/features/share/schema-ids.consts';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

describe('UploadFileHandler', () => {
  it('should upload file', async () => {
    const ids = await prepareProject(prismaService);
    const {
      headRevisionId,
      draftRevisionId,
      schemaTableVersionId,
      migrationTableVersionId,
    } = ids;

    const table = await prepareTableWithSchema({
      prismaService,
      headRevisionId,
      draftRevisionId,
      schemaTableVersionId,
      migrationTableVersionId,
      schema: getObjectSchema({
        file: getRefSchema(SystemSchemaIds.File),
        files: getArraySchema(getRefSchema(SystemSchemaIds.File)),
      }),
    });

    const file = {
      status: FileStatus.ready,
      fileId: nanoid(),
      url: '',
      fileName: '',
      hash: '',
      extension: '',
      mimeType: '',
      size: 0,
      width: 0,
      height: 0,
    };
    const data = {
      file,
      files: [],
    };

    const { rowDraft } = await prepareRow({
      prismaService,
      headTableVersionId: table.headTableVersionId,
      draftTableVersionId: table.draftTableVersionId,
      schema: table.schema,
      data: data,
      dataDraft: data,
    });

    const command = new UploadFileCommand({
      revisionId: draftRevisionId,
      tableId: table.tableId,
      rowId: rowDraft.id,
      fileId: file.fileId,
      file: createExpressImageFile(),
    });

    const result = await runTransaction(command);

    const row = await prismaService.row.findFirstOrThrow({
      where: {
        versionId: result.rowVersionId,
      },
    });

    expect((row.data as typeof data).file).toStrictEqual({
      extension: 'png',
      fileId: data.file.fileId,
      fileName: 'logo.png',
      hash: hash(command.data.file.buffer),
      height: 420,
      mimeType: 'image/png',
      size: 10037,
      status: 'uploaded',
      url: '',
      width: 420,
    });
  });

  function runTransaction(
    command: UploadFileCommand,
  ): Promise<UploadFileCommandReturnType> {
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
