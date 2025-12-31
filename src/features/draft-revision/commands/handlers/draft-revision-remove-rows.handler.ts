import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DraftRevisionRemoveRowsCommand } from 'src/features/draft-revision/commands/impl/draft-revision-remove-rows.command';
import {
  DraftRevisionGetOrCreateDraftTableCommandReturnType,
  DraftRevisionRemovedRowResult,
  DraftRevisionRemoveRowsCommandReturnType,
} from 'src/features/draft-revision/commands/impl';
import {
  DraftRevisionInternalService,
  DraftRevisionValidationService,
} from 'src/features/draft-revision/services';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

interface RowWithReadonly {
  id: string;
  versionId: string;
  readonly: boolean;
}

@CommandHandler(DraftRevisionRemoveRowsCommand)
export class DraftRevisionRemoveRowsHandler
  implements ICommandHandler<DraftRevisionRemoveRowsCommand>
{
  constructor(
    private readonly transactionService: TransactionPrismaService,
    private readonly internalService: DraftRevisionInternalService,
    private readonly validationService: DraftRevisionValidationService,
  ) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute({
    data,
  }: DraftRevisionRemoveRowsCommand): Promise<DraftRevisionRemoveRowsCommandReturnType> {
    const { revisionId, tableId, rowIds } = data;

    const revision = await this.internalService.findRevisionOrThrow(revisionId);
    this.validationService.ensureDraftRevision(revision);

    const uniqueRowIds = [...new Set(rowIds)];

    const tableResult = await this.internalService.getOrCreateDraftTable({
      revisionId,
      tableId,
    });

    const rows = await this.findRowsWithReadonly(
      tableResult.tableVersionId,
      uniqueRowIds,
    );

    this.ensureAllRowsFound(uniqueRowIds, rows);

    const removedRows = await this.removeRows(tableResult.tableVersionId, rows);

    const parentRevisionId =
      await this.internalService.findParentRevisionIdOrThrow(revisionId);
    await this.internalService.recomputeHasChanges(
      revisionId,
      parentRevisionId,
    );

    return this.buildResult(tableResult, removedRows);
  }

  private async findRowsWithReadonly(
    tableVersionId: string,
    rowIds: string[],
  ): Promise<RowWithReadonly[]> {
    return this.transaction.row.findMany({
      where: {
        id: { in: rowIds },
        tables: {
          some: { versionId: tableVersionId },
        },
      },
      select: {
        id: true,
        versionId: true,
        readonly: true,
      },
    });
  }

  private ensureAllRowsFound(
    requestedRowIds: string[],
    foundRows: RowWithReadonly[],
  ): void {
    const foundIds = new Set(foundRows.map((r) => r.id));
    const missing = requestedRowIds.filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Rows not found in table: ${missing.join(', ')}`,
      );
    }
  }

  private async removeRows(
    tableVersionId: string,
    rows: RowWithReadonly[],
  ): Promise<DraftRevisionRemovedRowResult[]> {
    const toDelete = rows.filter((r) => !r.readonly);
    const toDisconnect = rows.filter((r) => r.readonly);

    if (toDelete.length > 0) {
      await this.transaction.row.deleteMany({
        where: {
          versionId: { in: toDelete.map((r) => r.versionId) },
        },
      });
    }

    if (toDisconnect.length > 0) {
      await this.transaction.table.update({
        where: { versionId: tableVersionId },
        data: {
          rows: {
            disconnect: toDisconnect.map((r) => ({ versionId: r.versionId })),
          },
        },
      });
    }

    return rows.map((r) => ({
      rowVersionId: r.versionId,
      deleted: !r.readonly,
    }));
  }

  private buildResult(
    tableResult: DraftRevisionGetOrCreateDraftTableCommandReturnType,
    removedRows: DraftRevisionRemovedRowResult[],
  ): DraftRevisionRemoveRowsCommandReturnType {
    return {
      tableVersionId: tableResult.tableVersionId,
      previousTableVersionId: tableResult.previousTableVersionId,
      removedRows,
    };
  }
}
