import { BadRequestException } from '@nestjs/common';
import { CommandBus, CommandHandler } from '@nestjs/cqrs';
import {
  InternalUpdateRowCommand,
  InternalUpdateRowCommandReturnType,
} from 'src/features/draft/commands/impl/transactional/internal-update-row.command';
import {
  UploadFileCommand,
  UploadFileCommandData,
  UploadFileCommandReturnType,
} from 'src/features/draft/commands/impl/update-file.command';
import { DraftContextService } from 'src/features/draft/draft-context.service';
import { DraftHandler } from 'src/features/draft/draft.handler';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';
import { FilePlugin } from 'src/features/plugin/file/file.plugin';
import { JsonSchemaStoreService } from 'src/features/share/json-schema-store.service';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import { RowApiService } from 'src/features/row/row-api.service';
import { createJsonValueStore } from '@revisium/schema-toolkit/lib';
import { JsonValue, JsonSchema } from '@revisium/schema-toolkit/types';
import { S3Service } from 'src/infrastructure/database/s3.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@CommandHandler(UploadFileCommand)
export class UploadFileHandler extends DraftHandler<
  UploadFileCommand,
  UploadFileCommandReturnType
> {
  constructor(
    protected readonly commandBus: CommandBus,
    protected readonly transactionService: TransactionPrismaService,
    protected readonly draftContext: DraftContextService,
    protected readonly draftTransactionalCommands: DraftTransactionalCommands,
    protected readonly shareTransactionalQueries: ShareTransactionalQueries,
    protected readonly filePlugin: FilePlugin,
    protected readonly jsonSchemaStore: JsonSchemaStoreService,
    protected readonly s3Service: S3Service,
    protected readonly rowApiService: RowApiService,
  ) {
    super(transactionService, draftContext);
  }

  protected async handler({
    data: input,
  }: UploadFileCommand): Promise<UploadFileCommandReturnType> {
    const { revisionId, tableId, rowId } = input;

    await this.draftTransactionalCommands.resolveDraftRevision(revisionId);
    await this.draftTransactionalCommands.validateNotSystemTable(tableId);

    const schema = await this.shareTransactionalQueries.getTableSchema(
      revisionId,
      tableId,
    );

    const { nextData, fileHash } = await this.fileProcess({
      ...input,
      schema: schema.schema,
    });

    const result = await this.updateRow({
      revisionId,
      tableId,
      rowId,
      data: nextData,
      schemaHash: schema.hash,
    });

    return {
      ...result,
      path: this.filePlugin.getPathname(fileHash),
    };
  }

  protected async postActions(
    { data: { file } }: UploadFileCommand,
    { path }: UploadFileCommandReturnType,
  ) {
    await this.s3Service.uploadFile(file, path);
  }

  private async fileProcess(
    options: UploadFileCommandData & {
      schema: JsonSchema;
    },
  ) {
    const row = await this.rowApiService.getRow({
      revisionId: options.revisionId,
      tableId: options.tableId,
      rowId: options.rowId,
    });

    if (!row) {
      throw new BadRequestException('Row not found');
    }

    const valueStore = createJsonValueStore(
      this.jsonSchemaStore.create(options.schema),
      row.id,
      row.data as JsonValue,
    );

    const fileStore = await this.filePlugin.uploadFile({
      valueStore,
      fileId: options.fileId,
      file: options.file,
    });

    const nextData = valueStore.getPlainValue();

    await this.draftTransactionalCommands.validateData({
      revisionId: options.revisionId,
      tableId: options.tableId,
      rows: [{ rowId: row.id, data: nextData }],
    });

    return {
      nextData: valueStore.getPlainValue(),
      fileHash: fileStore.hash,
    };
  }

  private async updateRow(data: InternalUpdateRowCommand['data']) {
    return this.commandBus.execute<
      InternalUpdateRowCommand,
      InternalUpdateRowCommandReturnType
    >(new InternalUpdateRowCommand(data));
  }
}
