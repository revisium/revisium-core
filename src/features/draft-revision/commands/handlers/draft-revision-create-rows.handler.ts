import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import objectHash from 'object-hash';
import {
  DraftRevisionCreateRowsCommand,
  DraftRevisionCreateRowsRowData,
} from 'src/features/draft-revision/commands/impl/draft-revision-create-rows.command';
import {
  DraftRevisionCreatedRowResult,
  DraftRevisionCreateRowsCommandReturnType,
} from 'src/features/draft-revision/commands/impl';
import {
  DraftRevisionInternalService,
  DraftRevisionValidationService,
} from 'src/features/draft-revision/services';
import { systemTablesIds } from 'src/features/share/system-tables.consts';
import { IdService } from 'src/infrastructure/database/id.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@CommandHandler(DraftRevisionCreateRowsCommand)
export class DraftRevisionCreateRowsHandler
  implements ICommandHandler<DraftRevisionCreateRowsCommand>
{
  constructor(
    private readonly transactionService: TransactionPrismaService,
    private readonly internalService: DraftRevisionInternalService,
    private readonly idService: IdService,
    private readonly validationService: DraftRevisionValidationService,
  ) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute({
    data,
  }: DraftRevisionCreateRowsCommand): Promise<DraftRevisionCreateRowsCommandReturnType> {
    const revision = await this.internalService.findRevisionOrThrow(
      data.revisionId,
    );
    this.validationService.ensureDraftRevision(revision);

    const isSystemTable = systemTablesIds.includes(data.tableId);
    if (!isSystemTable) {
      data.rows.forEach((row) =>
        this.validationService.ensureValidRowId(row.rowId),
      );
    }
    this.ensureUniqueRowIds(data.rows.map((r) => r.rowId));

    const tableResult = await this.internalService.getOrCreateDraftTable({
      revisionId: data.revisionId,
      tableId: data.tableId,
    });

    await this.ensureNoRowsExist(
      tableResult.tableVersionId,
      data.rows.map((r) => r.rowId),
    );

    const createdRows = await this.createRowsInTable(
      tableResult.tableVersionId,
      data.rows,
    );

    await this.internalService.markRevisionAsChanged(data.revisionId);

    return {
      tableVersionId: tableResult.tableVersionId,
      previousTableVersionId: tableResult.previousTableVersionId,
      tableCreatedId: tableResult.tableCreatedId,
      createdRows,
    };
  }

  private ensureUniqueRowIds(rowIds: string[]): void {
    const unique = new Set(rowIds);
    if (unique.size !== rowIds.length) {
      throw new BadRequestException('Duplicate row IDs in request');
    }
  }

  private async ensureNoRowsExist(
    tableVersionId: string,
    rowIds: string[],
  ): Promise<void> {
    const existingRows = await this.findExistingRows(tableVersionId, rowIds);
    if (existingRows.length > 0) {
      throw new BadRequestException(
        `Rows already exist: ${existingRows.map((r) => r.id).join(', ')}`,
      );
    }
  }

  private async findExistingRows(
    tableVersionId: string,
    rowIds: string[],
  ): Promise<{ id: string }[]> {
    return this.transaction.row.findMany({
      where: {
        id: { in: rowIds },
        tables: {
          some: { versionId: tableVersionId },
        },
      },
      select: { id: true },
    });
  }

  private async createRowsInTable(
    tableVersionId: string,
    rows: DraftRevisionCreateRowsRowData[],
  ): Promise<DraftRevisionCreatedRowResult[]> {
    const rowsData = rows.map((row) => ({
      versionId: this.idService.generate(),
      createdId: this.idService.generate(),
      id: row.rowId,
      readonly: false,
      data: row.data,
      meta: row.meta ?? {},
      hash: objectHash(row.data as objectHash.NotUndefined),
      schemaHash: row.schemaHash ?? '',
      publishedAt: row.publishedAt,
    }));

    await this.transaction.table.update({
      where: { versionId: tableVersionId },
      data: {
        rows: {
          create: rowsData,
        },
      },
    });

    return rowsData.map((r) => ({
      rowVersionId: r.versionId,
      rowCreatedId: r.createdId,
    }));
  }
}
