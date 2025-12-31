import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import objectHash from 'object-hash';
import {
  DraftRevisionUpdateRowsCommand,
  DraftRevisionUpdateRowsRowData,
} from 'src/features/draft-revision/commands/impl/draft-revision-update-rows.command';
import { DraftRevisionUpdateRowsCommandReturnType } from 'src/features/draft-revision/commands/impl';
import {
  DraftRevisionInternalService,
  DraftRevisionValidationService,
} from 'src/features/draft-revision/services';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@CommandHandler(DraftRevisionUpdateRowsCommand)
export class DraftRevisionUpdateRowsHandler
  implements ICommandHandler<DraftRevisionUpdateRowsCommand>
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
  }: DraftRevisionUpdateRowsCommand): Promise<DraftRevisionUpdateRowsCommandReturnType> {
    const revision = await this.internalService.findRevisionOrThrow(
      data.revisionId,
    );
    this.validationService.ensureDraftRevision(revision);
    data.rows.forEach((row) =>
      this.validationService.ensureValidRowId(row.rowId),
    );

    const tableResult = await this.internalService.getOrCreateDraftTable({
      revisionId: data.revisionId,
      tableId: data.tableId,
    });

    const updatedRows = await Promise.all(
      data.rows.map(async (row) => {
        const rowResult = await this.internalService.getOrCreateDraftRow({
          tableVersionId: tableResult.tableVersionId,
          rowId: row.rowId,
        });
        await this.updateRowData(rowResult.rowVersionId, row);
        return {
          rowVersionId: rowResult.rowVersionId,
          previousRowVersionId: rowResult.previousRowVersionId,
        };
      }),
    );

    await this.internalService.markRevisionAsChanged(data.revisionId);

    return {
      tableVersionId: tableResult.tableVersionId,
      previousTableVersionId: tableResult.previousTableVersionId,
      updatedRows,
    };
  }

  private buildUpdateData(
    rowData: DraftRevisionUpdateRowsRowData,
  ): Record<string, unknown> {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
      data: rowData.data,
      hash: objectHash(rowData.data as objectHash.NotUndefined),
    };

    if (rowData.schemaHash !== undefined) {
      updateData.schemaHash = rowData.schemaHash;
    }

    if (rowData.meta !== undefined) {
      updateData.meta = rowData.meta;
    }

    if (rowData.publishedAt !== undefined) {
      updateData.publishedAt = rowData.publishedAt;
    }

    return updateData;
  }

  private async updateRowData(
    rowVersionId: string,
    rowData: DraftRevisionUpdateRowsRowData,
  ): Promise<void> {
    await this.transaction.row.update({
      where: { versionId: rowVersionId },
      data: this.buildUpdateData(rowData),
    });
  }
}
