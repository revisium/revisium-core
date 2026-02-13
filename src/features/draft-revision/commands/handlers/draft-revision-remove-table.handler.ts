import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DraftRevisionRemoveTableCommand } from 'src/features/draft-revision/commands/impl/draft-revision-remove-table.command';
import { DraftRevisionRemoveTableCommandReturnType } from 'src/features/draft-revision/commands/impl';
import {
  DraftRevisionInternalService,
  DraftRevisionValidationService,
} from 'src/features/draft-revision/services';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@CommandHandler(DraftRevisionRemoveTableCommand)
export class DraftRevisionRemoveTableHandler implements ICommandHandler<DraftRevisionRemoveTableCommand> {
  constructor(
    private readonly transactionService: TransactionPrismaService,
    private readonly validationService: DraftRevisionValidationService,
    private readonly internalService: DraftRevisionInternalService,
  ) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute({
    data,
  }: DraftRevisionRemoveTableCommand): Promise<DraftRevisionRemoveTableCommandReturnType> {
    const { revisionId, tableId } = data;

    const revision = await this.internalService.findRevisionOrThrow(revisionId);
    this.validationService.ensureDraftRevision(revision);
    const table = await this.findTableOrThrow(revisionId, tableId);
    const deleted = await this.removeTable(revisionId, table);

    await this.internalService.recomputeHasChanges(revisionId, tableId);

    return { tableVersionId: table.versionId, deleted };
  }

  private async findTableOrThrow(
    revisionId: string,
    tableId: string,
  ): Promise<{ versionId: string; readonly: boolean }> {
    const table = await this.findTableInRevision(revisionId, tableId);
    if (!table) {
      throw new BadRequestException(`Table "${tableId}" not found in revision`);
    }
    return table;
  }

  private async removeTable(
    revisionId: string,
    table: { versionId: string; readonly: boolean },
  ): Promise<boolean> {
    if (table.readonly) {
      await this.disconnectTableFromRevision(revisionId, table.versionId);
      return false;
    }
    await this.deleteTableWithRows(table.versionId);
    return true;
  }

  private async deleteTableWithRows(tableVersionId: string): Promise<void> {
    const rows = await this.getTableRowsWithTableCount(tableVersionId);
    await this.deleteOrphanedRows(rows);
    await this.deleteTable(tableVersionId);
  }

  private async deleteOrphanedRows(
    rows: { versionId: string; tableCount: number }[],
  ): Promise<void> {
    const orphanedRows = rows.filter((r) => r.tableCount === 1);
    if (orphanedRows.length > 0) {
      await this.transaction.row.deleteMany({
        where: {
          versionId: { in: orphanedRows.map((r) => r.versionId) },
        },
      });
    }
  }

  private async findTableInRevision(
    revisionId: string,
    tableId: string,
  ): Promise<{ versionId: string; readonly: boolean } | null> {
    return this.transaction.table.findFirst({
      where: {
        id: tableId,
        revisions: {
          some: { id: revisionId },
        },
      },
      select: { versionId: true, readonly: true },
    });
  }

  private async getTableRowsWithTableCount(
    tableVersionId: string,
  ): Promise<{ versionId: string; tableCount: number }[]> {
    const rows = await this.transaction.row.findMany({
      where: {
        tables: {
          some: { versionId: tableVersionId },
        },
      },
      select: {
        versionId: true,
        _count: { select: { tables: true } },
      },
    });

    return rows.map((r) => ({
      versionId: r.versionId,
      tableCount: r._count.tables,
    }));
  }

  private async deleteTable(tableVersionId: string): Promise<void> {
    await this.transaction.table.delete({
      where: { versionId: tableVersionId },
    });
  }

  private async disconnectTableFromRevision(
    revisionId: string,
    tableVersionId: string,
  ): Promise<void> {
    await this.transaction.revision.update({
      where: { id: revisionId },
      data: {
        tables: {
          disconnect: { versionId: tableVersionId },
        },
      },
    });
  }
}
