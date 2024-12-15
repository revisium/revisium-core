import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import { TransactionPrismaService } from 'src/database/transaction-prisma.service';
import { ResolveRowReferencesByQuery } from 'src/row/queries/impl';
import { ResolveRowCountReferencesByQuery } from 'src/row/queries/impl/resolve-row-count-references-by.query';
import { ReferencesService } from 'src/share/references.service';
import { CustomSchemeKeywords } from 'src/share/schema/consts';
import { ShareTransactionalQueries } from 'src/share/share.transactional.queries';
import { SystemTables } from 'src/share/system-tables.consts';
import { createJsonSchemaStore } from 'src/share/utils/schema/lib/createJsonSchemaStore';
import { getValuePathByStore } from 'src/share/utils/schema/lib/getValuePathByStore';
import { traverseStore } from 'src/share/utils/schema/lib/traverseStore';
import {
  JsonSchema,
  JsonSchemaTypeName,
} from 'src/share/utils/schema/types/schema.types';

@QueryHandler(ResolveRowCountReferencesByQuery)
export class ResolveRowCountReferencesByHandler
  implements IQueryHandler<ResolveRowCountReferencesByQuery>
{
  constructor(
    private readonly transactionService: TransactionPrismaService,
    private readonly shareTransactionalQueries: ShareTransactionalQueries,
    private readonly referencesService: ReferencesService,
  ) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute({ data }: ResolveRowReferencesByQuery) {
    return this.transactionService.run(() => this.transactionHandler(data), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  private async transactionHandler(
    data: ResolveRowCountReferencesByQuery['data'],
  ) {
    const schemaTable =
      await this.shareTransactionalQueries.findTableInRevisionOrThrow(
        data.revisionId,
        SystemTables.Schema,
      );

    const referenceTableIds = (
      await this.referencesService.findRowsByKeyValueInData(
        schemaTable.versionId,
        CustomSchemeKeywords.Reference,
        data.tableId,
      )
    ).map((row) => row.id);

    const results = await Promise.all(
      referenceTableIds.map((referenceTableId) =>
        this.getCountByReferenceTableId(
          data.revisionId,
          data.rowId,
          referenceTableId,
        ),
      ),
    );

    return results.reduce((sum, result) => {
      return sum + result;
    }, 0);
  }

  async getCountByReferenceTableId(
    revisionId: string,
    rowId: string,
    referenceTableId: string,
  ) {
    // TODO move to shared

    const referenceTable =
      await this.shareTransactionalQueries.findTableInRevisionOrThrow(
        revisionId,
        referenceTableId,
      );

    const schema = await this.shareTransactionalQueries.getTableSchema(
      revisionId,
      referenceTableId,
    );

    const schemaStore = createJsonSchemaStore(schema as JsonSchema);

    const paths: string[] = [];

    traverseStore(schemaStore, (item) => {
      if (item.type === JsonSchemaTypeName.String && item.reference) {
        paths.push(getValuePathByStore(item));
      }
    });

    return this.referencesService.countRowsByPathsAndValueInData(
      referenceTable.versionId,
      paths,
      rowId,
    );
  }
}
