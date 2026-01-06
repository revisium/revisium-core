import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  DraftRevisionRenameRowItem,
  DraftRevisionRenameRowsCommand,
} from 'src/features/draft-revision/commands/impl/draft-revision-rename-rows.command';
import {
  DraftRevisionRenamedRowResult,
  DraftRevisionRenameRowsCommandReturnType,
} from 'src/features/draft-revision/commands/impl';
import {
  DraftRevisionInternalService,
  DraftRevisionValidationService,
} from 'src/features/draft-revision/services';
import { systemTablesIds } from 'src/features/share/system-tables.consts';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@CommandHandler(DraftRevisionRenameRowsCommand)
export class DraftRevisionRenameRowsHandler
  implements ICommandHandler<DraftRevisionRenameRowsCommand>
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
  }: DraftRevisionRenameRowsCommand): Promise<DraftRevisionRenameRowsCommandReturnType> {
    const revision = await this.internalService.findRevisionOrThrow(
      data.revisionId,
    );
    this.validationService.ensureDraftRevision(revision);

    const isSystemTable = systemTablesIds.includes(data.tableId);
    this.validateRenames(data.renames, isSystemTable);

    const tableResult = await this.internalService.getOrCreateDraftTable({
      revisionId: data.revisionId,
      tableId: data.tableId,
    });

    await this.ensureNoConflicts(tableResult.tableVersionId, data.renames);

    const renamedRows = await Promise.all(
      data.renames.map((rename) =>
        this.renameRow(tableResult.tableVersionId, rename),
      ),
    );

    await this.internalService.markRevisionAsChanged(data.revisionId);

    return {
      tableVersionId: tableResult.tableVersionId,
      previousTableVersionId: tableResult.previousTableVersionId,
      tableCreatedId: tableResult.tableCreatedId,
      renamedRows,
    };
  }

  private validateRenames(
    renames: DraftRevisionRenameRowItem[],
    isSystemTable: boolean,
  ): void {
    renames.forEach((rename) => {
      if (!isSystemTable) {
        this.validationService.ensureValidRowId(rename.rowId);
        this.validationService.ensureValidRowId(rename.nextRowId);
      }
      this.validationService.ensureIdsDifferent(rename.rowId, rename.nextRowId);
    });

    this.ensureUniqueIds(renames);
  }

  private ensureUniqueIds(renames: DraftRevisionRenameRowItem[]): void {
    const rowIds = renames.map((r) => r.rowId);
    const nextRowIds = renames.map((r) => r.nextRowId);

    const uniqueRowIds = new Set(rowIds);
    if (uniqueRowIds.size !== rowIds.length) {
      throw new BadRequestException('Duplicate source row IDs in request');
    }

    const uniqueNextRowIds = new Set(nextRowIds);
    if (uniqueNextRowIds.size !== nextRowIds.length) {
      throw new BadRequestException('Duplicate target row IDs in request');
    }
  }

  private async ensureNoConflicts(
    tableVersionId: string,
    renames: DraftRevisionRenameRowItem[],
  ): Promise<void> {
    const rowIds = renames.map((r) => r.rowId);
    const nextRowIds = renames.map((r) => r.nextRowId);
    const rowIdsSet = new Set(rowIds);

    const conflicting = await this.transaction.row.findMany({
      where: {
        id: { in: nextRowIds },
        tables: {
          some: { versionId: tableVersionId },
        },
      },
      select: { id: true },
    });

    const realConflicts = conflicting.filter((row) => !rowIdsSet.has(row.id));
    if (realConflicts.length > 0) {
      throw new BadRequestException(
        `Rows already exist: ${realConflicts.map((r) => r.id).join(', ')}`,
      );
    }
  }

  private async renameRow(
    tableVersionId: string,
    rename: DraftRevisionRenameRowItem,
  ): Promise<DraftRevisionRenamedRowResult> {
    const rowResult = await this.internalService.getOrCreateDraftRow({
      tableVersionId,
      rowId: rename.rowId,
    });

    await this.transaction.row.update({
      where: { versionId: rowResult.rowVersionId },
      data: {
        updatedAt: new Date(),
        id: rename.nextRowId,
      },
    });

    return {
      rowVersionId: rowResult.rowVersionId,
      previousRowVersionId: rowResult.previousRowVersionId,
    };
  }
}
