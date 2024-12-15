import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import { TransactionPrismaService } from 'src/database/transaction-prisma.service';
import { ReferencesService } from 'src/share/references.service';
import { CustomSchemeKeywords } from 'src/share/schema/consts';
import { ShareTransactionalQueries } from 'src/share/share.transactional.queries';
import {
  findSchemaForSystemTables,
  SystemTables,
} from 'src/share/system-tables.consts';
import { ResolveTableCountReferencesByQuery } from 'src/table/queries/impl';

@QueryHandler(ResolveTableCountReferencesByQuery)
export class ResolveTableCountReferencesByHandler
  implements IQueryHandler<ResolveTableCountReferencesByQuery>
{
  constructor(
    private readonly transactionService: TransactionPrismaService,
    private readonly shareTransactionalQueries: ShareTransactionalQueries,
    private readonly referencesService: ReferencesService,
  ) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute({ data }: ResolveTableCountReferencesByQuery) {
    return this.transactionService.run(() => this.transactionHandler(data), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  private async transactionHandler(
    data: ResolveTableCountReferencesByQuery['data'],
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
    return this.referencesService.countRowsByKeyValueInData(
      schemaTableVersionId,
      CustomSchemeKeywords.Reference,
      tableId,
    );
  }
}
