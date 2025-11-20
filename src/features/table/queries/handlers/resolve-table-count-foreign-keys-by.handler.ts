import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Prisma } from 'src/__generated__/client';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { ForeignKeysService } from 'src/features/share/foreign-keys.service';
import { CustomSchemeKeywords } from 'src/features/share/schema/consts';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import {
  findSchemaForSystemTables,
  SystemTables,
} from 'src/features/share/system-tables.consts';
import { ResolveTableCountForeignKeysByQuery } from 'src/features/table/queries/impl';

@QueryHandler(ResolveTableCountForeignKeysByQuery)
export class ResolveTableCountForeignKeysByHandler
  implements IQueryHandler<ResolveTableCountForeignKeysByQuery>
{
  constructor(
    private readonly transactionService: TransactionPrismaService,
    private readonly shareTransactionalQueries: ShareTransactionalQueries,
    private readonly foreignKeysService: ForeignKeysService,
  ) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute({ data }: ResolveTableCountForeignKeysByQuery) {
    return this.transactionService.run(() => this.transactionHandler(data), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  private async transactionHandler(
    data: ResolveTableCountForeignKeysByQuery['data'],
  ) {
    const foundSystemMetaSchema = findSchemaForSystemTables(data.tableId);

    if (foundSystemMetaSchema) {
      return 0;
    }

    const schemaTable =
      await this.shareTransactionalQueries.findTableInRevisionOrThrow(
        data.revisionId,
        SystemTables.Schema,
      );

    return this.getTablesCountByRevision(schemaTable.versionId, data.tableId);
  }

  private getTablesCountByRevision(
    schemaTableVersionId: string,
    tableId: string,
  ) {
    return this.foreignKeysService.countRowsByKeyValueInData(
      schemaTableVersionId,
      CustomSchemeKeywords.ForeignKey,
      tableId,
    );
  }
}
