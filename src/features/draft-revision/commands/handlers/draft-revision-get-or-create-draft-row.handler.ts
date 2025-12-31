import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DraftRevisionGetOrCreateDraftRowCommand } from 'src/features/draft-revision/commands/impl/draft-revision-get-or-create-draft-row.command';
import { DraftRevisionGetOrCreateDraftRowCommandReturnType } from 'src/features/draft-revision/commands/impl';
import { IdService } from 'src/infrastructure/database/id.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@CommandHandler(DraftRevisionGetOrCreateDraftRowCommand)
export class DraftRevisionGetOrCreateDraftRowHandler
  implements ICommandHandler<DraftRevisionGetOrCreateDraftRowCommand>
{
  constructor(
    private readonly transactionService: TransactionPrismaService,
    private readonly idService: IdService,
  ) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute({
    data,
  }: DraftRevisionGetOrCreateDraftRowCommand): Promise<DraftRevisionGetOrCreateDraftRowCommandReturnType> {
    const { tableVersionId, rowId } = data;

    const row = await this.findRowOrThrow(tableVersionId, rowId);

    if (!row.readonly) {
      return this.buildExistingResult(row);
    }

    return this.createNewRowVersion(tableVersionId, rowId, row);
  }

  private async findRowOrThrow(
    tableVersionId: string,
    rowId: string,
  ): Promise<RowWithDetails> {
    const row = await this.findRowInTable(tableVersionId, rowId);
    if (!row) {
      throw new BadRequestException(`Row "${rowId}" not found in table`);
    }
    return row;
  }

  private buildExistingResult(
    row: RowWithDetails,
  ): DraftRevisionGetOrCreateDraftRowCommandReturnType {
    return {
      rowVersionId: row.versionId,
      previousRowVersionId: row.versionId,
      rowCreatedId: row.createdId,
      wasCreated: false,
    };
  }

  private async createNewRowVersion(
    tableVersionId: string,
    rowId: string,
    previousRow: RowWithDetails,
  ): Promise<DraftRevisionGetOrCreateDraftRowCommandReturnType> {
    const newRowVersionId = await this.cloneRow(
      tableVersionId,
      rowId,
      previousRow,
    );
    await this.replaceRowInTable(tableVersionId, previousRow.versionId);

    return {
      rowVersionId: newRowVersionId,
      previousRowVersionId: previousRow.versionId,
      rowCreatedId: previousRow.createdId,
      wasCreated: true,
    };
  }

  private async replaceRowInTable(
    tableVersionId: string,
    oldRowVersionId: string,
  ): Promise<void> {
    await this.disconnectRowFromTable(tableVersionId, oldRowVersionId);
  }

  private async findRowInTable(
    tableVersionId: string,
    rowId: string,
  ): Promise<RowWithDetails | null> {
    return this.transaction.row.findFirst({
      where: {
        id: rowId,
        tables: {
          some: { versionId: tableVersionId },
        },
      },
      select: {
        versionId: true,
        createdId: true,
        readonly: true,
        data: true,
        meta: true,
        hash: true,
        schemaHash: true,
        createdAt: true,
        publishedAt: true,
      },
    });
  }

  private async cloneRow(
    tableVersionId: string,
    rowId: string,
    previousRow: RowWithDetails,
  ): Promise<string> {
    const newRowVersionId = this.idService.generate();

    await this.transaction.row.create({
      data: {
        versionId: newRowVersionId,
        createdId: previousRow.createdId,
        id: rowId,
        readonly: false,
        tables: {
          connect: { versionId: tableVersionId },
        },
        data: previousRow.data as object,
        meta: previousRow.meta as object,
        hash: previousRow.hash,
        schemaHash: previousRow.schemaHash,
        createdAt: previousRow.createdAt,
        publishedAt: previousRow.publishedAt ?? undefined,
      },
    });

    return newRowVersionId;
  }

  private async disconnectRowFromTable(
    tableVersionId: string,
    rowVersionId: string,
  ): Promise<void> {
    await this.transaction.table.update({
      where: { versionId: tableVersionId },
      data: {
        rows: {
          disconnect: { versionId: rowVersionId },
        },
      },
    });
  }
}

type RowWithDetails = {
  versionId: string;
  createdId: string;
  readonly: boolean;
  data: unknown;
  meta: unknown;
  hash: string;
  schemaHash: string;
  createdAt: Date;
  publishedAt: Date | null;
};
