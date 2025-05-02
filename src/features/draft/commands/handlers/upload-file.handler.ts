import { CommandBus, CommandHandler } from '@nestjs/cqrs';
import * as hash from 'object-hash';
import { extname } from 'path';
import * as sharp from 'sharp';
import {
  InternalUpdateRowCommand,
  InternalUpdateRowCommandReturnType,
} from 'src/features/draft/commands/impl/transactional/internal-update-row.command';
import {
  UploadFileCommand,
  UploadFileCommandReturnType,
} from 'src/features/draft/commands/impl/update-file.command';
import { DraftRevisionRequestDto } from 'src/features/draft/draft-request-dto/draft-revision-request.dto';
import { FileStatus } from 'src/features/plugin/file.plugin';
import { PluginService } from 'src/features/plugin/plugin.service';
import { JsonSchemaStoreService } from 'src/features/share/json-schema-store.service';
import { SystemSchemaIds } from 'src/features/share/schema-ids.consts';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import { createJsonValueStore } from 'src/features/share/utils/schema/lib/createJsonValueStore';
import { traverseValue } from 'src/features/share/utils/schema/lib/traverseValue';
import { JsonNumberValueStore } from 'src/features/share/utils/schema/model/value/json-number-value.store';
import { JsonObjectValueStore } from 'src/features/share/utils/schema/model/value/json-object-value.store';
import { JsonStringValueStore } from 'src/features/share/utils/schema/model/value/json-string-value.store';
import { JsonValueStore } from 'src/features/share/utils/schema/model/value/json-value.store';
import { JsonValue } from 'src/features/share/utils/schema/types/json.types';
import { JsonSchemaTypeName } from 'src/features/share/utils/schema/types/schema.types';
import { S3Service } from 'src/infrastructure/database/s3.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { UpdateRowHandlerReturnType } from 'src/features/draft/commands/types/update-row.handler.types';
import { DraftContextService } from 'src/features/draft/draft-context.service';
import { DraftTableRequestDto } from 'src/features/draft/draft-request-dto/table-request.dto';
import { DraftHandler } from 'src/features/draft/draft.handler';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';

@CommandHandler(UploadFileCommand)
export class UploadFileHandler extends DraftHandler<
  UploadFileCommand,
  UploadFileCommandReturnType
> {
  constructor(
    protected readonly commandBus: CommandBus,
    protected readonly transactionService: TransactionPrismaService,
    protected readonly draftContext: DraftContextService,
    protected readonly revisionRequestDto: DraftRevisionRequestDto,
    protected readonly tableRequestDto: DraftTableRequestDto,
    protected readonly draftTransactionalCommands: DraftTransactionalCommands,
    protected readonly shareTransactionalQueries: ShareTransactionalQueries,
    protected readonly pluginService: PluginService,
    protected readonly jsonSchemaStore: JsonSchemaStoreService,
    protected readonly s3Service: S3Service,
  ) {
    super(transactionService, draftContext);
  }

  protected async handler({
    data: input,
  }: UploadFileCommand): Promise<UpdateRowHandlerReturnType> {
    const { revisionId, tableId, rowId, fileId, file } = input;

    await this.draftTransactionalCommands.resolveDraftRevision(revisionId);
    await this.draftTransactionalCommands.validateNotSystemTable(tableId);

    const table =
      await this.shareTransactionalQueries.findTableInRevisionOrThrow(
        revisionId,
        tableId,
      );

    const { versionId: rowVersionId } =
      await this.shareTransactionalQueries.findRowInTableOrThrow(
        table.versionId,
        rowId,
      );

    await this.draftTransactionalCommands.getOrCreateDraftTable(tableId);
    await this.draftTransactionalCommands.getOrCreateDraftRow(rowId);

    const row = await this.getRow(rowVersionId);

    const schema = await this.shareTransactionalQueries.getTableSchema(
      revisionId,
      tableId,
    );

    const jsonValueStore = createJsonValueStore(
      this.jsonSchemaStore.create(schema.schema),
      rowId,
      row.data as JsonValue,
    );

    const fileStore = this.findFileStore(jsonValueStore, fileId);

    if (fileStore) {
      const statusStore = fileStore.value['status'] as JsonStringValueStore;
      statusStore.value = FileStatus.uploaded;

      const fromRowVersionIdStore = fileStore.value[
        'fromRowVersionId'
      ] as JsonStringValueStore;
      fromRowVersionIdStore.value = row.versionId;

      const fileNameStore = fileStore.value['fileName'] as JsonStringValueStore;
      fileNameStore.value = file.originalname;

      const hashStore = fileStore.value['hash'] as JsonStringValueStore;
      hashStore.value = hash(file.buffer);

      const mimeTypeStore = fileStore.value['mimeType'] as JsonStringValueStore;
      mimeTypeStore.value = file.mimetype;

      const sizeStore = fileStore.value['size'] as JsonNumberValueStore;
      sizeStore.value = file.size;

      const extensionStore = fileStore.value[
        'extension'
      ] as JsonStringValueStore;
      extensionStore.value = extname(file.originalname).slice(1);

      let width = 0;
      let height = 0;

      if (file.mimetype.startsWith('image/')) {
        const metadata = await sharp(file.buffer).metadata();
        width = metadata.width || 0;
        height = metadata.height || 0;
      }

      const widthStore = fileStore.value['width'] as JsonNumberValueStore;
      widthStore.value = width;

      const heightStore = fileStore.value['height'] as JsonNumberValueStore;
      heightStore.value = height;
    }

    const nextData = jsonValueStore.getPlainValue();

    await this.draftTransactionalCommands.validateData({
      revisionId,
      tableId,
      rows: [{ rowId, data: nextData }],
    });
    await this.updateRevision(revisionId);

    await this.s3Service.uploadFile(
      file,
      `${this.revisionRequestDto.organizationId}/${fileId}-${row.versionId}`,
    );

    return this.updateRow({
      revisionId,
      tableId,
      rowId,
      data: nextData,
      schemaHash: schema.hash,
    });
  }

  private async updateRevision(revisionId: string) {
    return this.transaction.revision.updateMany({
      where: { id: revisionId, hasChanges: false },
      data: {
        hasChanges: true,
      },
    });
  }

  private async updateRow(data: InternalUpdateRowCommand['data']) {
    return this.commandBus.execute<
      InternalUpdateRowCommand,
      InternalUpdateRowCommandReturnType
    >(new InternalUpdateRowCommand(data));
  }

  private getRow(rowVersionId: string) {
    return this.transaction.row.findUniqueOrThrow({
      where: { versionId: rowVersionId },
    });
  }

  private findFileStore(
    jsonValueStore: JsonValueStore,
    fileId: string,
  ): JsonObjectValueStore | undefined {
    const fileStore: JsonObjectValueStore[] = [];

    traverseValue(jsonValueStore, (item) => {
      if (item.schema.$ref === SystemSchemaIds.File) {
        if (item.type === JsonSchemaTypeName.Object) {
          const fileIdStore = item.value['fileId'] as JsonStringValueStore;

          if (fileIdStore.getPlainValue() === fileId) {
            fileStore.push(item);
          }
        }
      }
    });

    return fileStore[0];
  }
}
