import { BadRequestException } from '@nestjs/common';
import { CommandHandler, EventBus } from '@nestjs/cqrs';
import { RowsDeletedEvent } from 'src/infrastructure/cache';
import { JsonSchemaStoreService } from 'src/features/share/json-schema-store.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { RemoveRowsCommand } from 'src/features/draft/commands/impl/remove-rows.command';
import { RemoveRowsHandlerReturnType } from 'src/features/draft/commands/types/remove-rows.handler.types';
import { DraftContextService } from 'src/features/draft/draft-context.service';
import { DraftRevisionRequestDto } from 'src/features/draft/draft-request-dto/draft-revision-request.dto';
import { DraftHandler } from 'src/features/draft/draft.handler';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';
import { ForeignKeysService } from 'src/features/share/foreign-keys.service';
import { CustomSchemeKeywords } from 'src/features/share/schema/consts';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import { SystemTables } from 'src/features/share/system-tables.consts';
import {
  getDBJsonPathByJsonSchemaStore,
  traverseStore,
} from '@revisium/schema-toolkit/lib';
import { JsonSchemaTypeName } from '@revisium/schema-toolkit/types';
import { DraftRevisionApiService } from 'src/features/draft-revision/draft-revision-api.service';

@CommandHandler(RemoveRowsCommand)
export class RemoveRowsHandler extends DraftHandler<
  RemoveRowsCommand,
  RemoveRowsHandlerReturnType
> {
  constructor(
    protected readonly transactionService: TransactionPrismaService,
    protected readonly draftContext: DraftContextService,
    protected readonly eventBus: EventBus,
    protected readonly revisionRequestDto: DraftRevisionRequestDto,
    protected readonly shareTransactionalQueries: ShareTransactionalQueries,
    protected readonly draftTransactionalCommands: DraftTransactionalCommands,
    protected readonly foreignKeysService: ForeignKeysService,
    protected readonly jsonSchemaStore: JsonSchemaStoreService,
    protected readonly draftRevisionApi: DraftRevisionApiService,
  ) {
    super(transactionService, draftContext);
  }

  protected async postActions({ data }: RemoveRowsCommand) {
    const uniqueRowIds = [...new Set(data.rowIds)];
    await this.eventBus.publishAll([
      new RowsDeletedEvent(data.revisionId, data.tableId, uniqueRowIds),
    ]);
  }

  protected async handler({
    data: input,
  }: RemoveRowsCommand): Promise<RemoveRowsHandlerReturnType> {
    const { revisionId, tableId, rowIds, avoidCheckingSystemTable } = input;

    if (!rowIds.length) {
      throw new BadRequestException('rowIds array cannot be empty');
    }

    const uniqueRowIds = [...new Set(rowIds)];

    await this.draftTransactionalCommands.resolveDraftRevision(revisionId);

    if (!avoidCheckingSystemTable) {
      await this.draftTransactionalCommands.validateNotSystemTable(tableId);
      await this.validateForeignKeys({ ...input, rowIds: uniqueRowIds });
    }

    const result = await this.draftRevisionApi.removeRows({
      revisionId,
      tableId,
      rowIds: uniqueRowIds,
    });

    return {
      branchId: this.revisionRequestDto.branchId,
      tableVersionId: result.tableVersionId,
      previousTableVersionId: result.previousTableVersionId,
    };
  }

  private async validateForeignKeys(data: RemoveRowsCommand['data']) {
    const schemaTable =
      await this.shareTransactionalQueries.findTableInRevisionOrThrow(
        data.revisionId,
        SystemTables.Schema,
      );

    const foreignKeyTableIds = (
      await this.foreignKeysService.findRowsByKeyValueInData(
        schemaTable.versionId,
        CustomSchemeKeywords.ForeignKey,
        data.tableId,
      )
    ).map((row) => row.id);

    for (const foreignKeyTableId of foreignKeyTableIds) {
      const foreignKeyTable =
        await this.shareTransactionalQueries.findTableInRevisionOrThrow(
          data.revisionId,
          foreignKeyTableId,
        );

      const { schema } = await this.shareTransactionalQueries.getTableSchema(
        data.revisionId,
        foreignKeyTableId,
      );

      const schemaStore = this.jsonSchemaStore.create(schema);

      const paths: string[] = [];

      traverseStore(schemaStore, (item) => {
        if (item.type === JsonSchemaTypeName.String && item.foreignKey) {
          paths.push(getDBJsonPathByJsonSchemaStore(item));
        }
      });

      const count =
        await this.foreignKeysService.countRowsByPathsAndValuesInData(
          foreignKeyTable.versionId,
          paths,
          data.rowIds,
        );

      if (count) {
        throw new BadRequestException(`The row is related to other rows`);
      }
    }
  }
}
