import { CommandBus } from '@nestjs/cqrs';
import { nanoid } from 'nanoid';
import hash from 'object-hash';
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
} from '@revisium/schema-toolkit/mocks';
import { createTestingModule } from 'src/features/draft/commands/handlers/__tests__/utils';
import {
  UploadFileCommand,
  UploadFileCommandReturnType,
} from 'src/features/draft/commands/impl/update-file.command';
import { FileStatus } from 'src/features/plugin/file/consts';
import { RowApiService } from 'src/features/row/row-api.service';
import { SystemSchemaIds } from '@revisium/schema-toolkit/consts';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

describe('UploadFileHandler', () => {
  it('should throw error when row not found', async () => {
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
      }),
    });

    const command = new UploadFileCommand({
      revisionId: draftRevisionId,
      tableId: table.tableId,
      rowId: 'non-existent-row',
      fileId: nanoid(),
      file: createExpressImageFile(),
    });

    await expect(runTransaction(command)).rejects.toThrow('Row not found');
  });

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
    expect(result.rowVersionId).toBeTruthy();

    const row = await rowApiService.getRow({
      revisionId: draftRevisionId,
      tableId: table.tableId,
      rowId: rowDraft.id,
    });

    expect(row).not.toBeNull();
    const fileHash = hash(command.data.file.buffer);
    expect((row?.data as typeof data).file).toStrictEqual({
      extension: 'png',
      fileId: data.file.fileId,
      fileName: 'logo.png',
      hash: fileHash,
      height: 420,
      mimeType: 'image/png',
      size: 10037,
      status: 'uploaded',
      url: `/${fileHash}`,
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
  let rowApiService: RowApiService;

  beforeAll(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    commandBus = result.commandBus;
    transactionService = result.transactionService;
    rowApiService = result.module.get<RowApiService>(RowApiService);
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });
});
