import { Injectable } from '@nestjs/common';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import {
  findSchemaForSystemTables,
  SystemTables,
} from 'src/features/share/system-tables.consts';
import { FindTableInRevisionType } from 'src/features/share/queries/types';
import { IdService } from 'src/infrastructure/database/id.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

export type EnsureSystemTableResult = FindTableInRevisionType;

@Injectable()
export class SystemTablesService {
  constructor(
    private readonly transactionService: TransactionPrismaService,
    private readonly shareTransactionalQueries: ShareTransactionalQueries,
    private readonly idService: IdService,
  ) {}

  private get transaction() {
    return this.transactionService.getTransactionOrPrisma();
  }

  public async ensureSystemTable(
    revisionId: string,
    systemTableId: SystemTables,
  ): Promise<EnsureSystemTableResult> {
    const existingTable =
      await this.shareTransactionalQueries.findTableInRevision(
        revisionId,
        systemTableId,
      );

    if (existingTable) {
      return existingTable;
    }

    return this.createSystemTable(revisionId, systemTableId);
  }

  private async createSystemTable(
    revisionId: string,
    systemTableId: SystemTables,
  ): Promise<EnsureSystemTableResult> {
    const schema = findSchemaForSystemTables(systemTableId);
    if (!schema) {
      throw new Error(`No schema defined for system table: ${systemTableId}`);
    }

    const versionId = this.idService.generate();
    const createdId = this.idService.generate();

    const table = await this.transaction.table.create({
      data: {
        versionId,
        createdId,
        id: systemTableId,
        readonly: false,
        system: true,
        revisions: {
          connect: {
            id: revisionId,
          },
        },
      },
    });

    await this.transaction.revision.updateMany({
      where: { id: revisionId, hasChanges: false },
      data: { hasChanges: true },
    });

    return {
      versionId: table.versionId,
      createdId: table.createdId,
      createdAt: table.createdAt,
      updatedAt: table.updatedAt,
      readonly: table.readonly,
      system: table.system,
    };
  }
}
