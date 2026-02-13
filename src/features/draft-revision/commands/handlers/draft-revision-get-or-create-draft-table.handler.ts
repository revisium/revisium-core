import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DraftRevisionGetOrCreateDraftTableCommand } from 'src/features/draft-revision/commands/impl/draft-revision-get-or-create-draft-table.command';
import { DraftRevisionGetOrCreateDraftTableCommandReturnType } from 'src/features/draft-revision/commands/impl';
import { IdService } from 'src/infrastructure/database/id.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@CommandHandler(DraftRevisionGetOrCreateDraftTableCommand)
export class DraftRevisionGetOrCreateDraftTableHandler implements ICommandHandler<DraftRevisionGetOrCreateDraftTableCommand> {
  constructor(
    private readonly transactionService: TransactionPrismaService,
    private readonly idService: IdService,
  ) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute({
    data,
  }: DraftRevisionGetOrCreateDraftTableCommand): Promise<DraftRevisionGetOrCreateDraftTableCommandReturnType> {
    const { revisionId, tableId } = data;

    const table = await this.findTableOrThrow(revisionId, tableId);

    if (!table.readonly) {
      return this.buildExistingResult(table);
    }

    return this.createNewTableVersion(revisionId, tableId, table);
  }

  private async findTableOrThrow(
    revisionId: string,
    tableId: string,
  ): Promise<TableWithDetails> {
    const table = await this.findTableInRevision(revisionId, tableId);
    if (!table) {
      throw new BadRequestException(`Table "${tableId}" not found in revision`);
    }
    return table;
  }

  private buildExistingResult(
    table: TableWithDetails,
  ): DraftRevisionGetOrCreateDraftTableCommandReturnType {
    return {
      tableVersionId: table.versionId,
      previousTableVersionId: table.versionId,
      tableCreatedId: table.createdId,
      wasCreated: false,
    };
  }

  private async createNewTableVersion(
    revisionId: string,
    tableId: string,
    previousTable: TableWithDetails,
  ): Promise<DraftRevisionGetOrCreateDraftTableCommandReturnType> {
    const newTableVersionId = await this.cloneTable(
      revisionId,
      tableId,
      previousTable,
    );
    await this.replaceTableInRevision(revisionId, previousTable.versionId);

    return {
      tableVersionId: newTableVersionId,
      previousTableVersionId: previousTable.versionId,
      tableCreatedId: previousTable.createdId,
      wasCreated: true,
    };
  }

  private async replaceTableInRevision(
    revisionId: string,
    oldTableVersionId: string,
  ): Promise<void> {
    await this.disconnectTableFromRevision(revisionId, oldTableVersionId);
  }

  private async findTableInRevision(
    revisionId: string,
    tableId: string,
  ): Promise<TableWithDetails | null> {
    return this.transaction.table.findFirst({
      where: {
        id: tableId,
        revisions: {
          some: { id: revisionId },
        },
      },
      select: {
        versionId: true,
        createdId: true,
        readonly: true,
        system: true,
        createdAt: true,
      },
    });
  }

  private async getTableRows(
    revisionId: string,
    tableVersionId: string,
  ): Promise<{ versionId: string }[]> {
    return this.transaction.table
      .findUniqueOrThrow({
        where: {
          versionId: tableVersionId,
          revisions: { some: { id: revisionId } },
        },
      })
      .rows({ select: { versionId: true } });
  }

  private async cloneTable(
    revisionId: string,
    tableId: string,
    previousTable: TableWithDetails,
  ): Promise<string> {
    const previousRows = await this.getTableRows(
      revisionId,
      previousTable.versionId,
    );
    const newTableVersionId = this.idService.generate();

    await this.transaction.table.create({
      data: {
        versionId: newTableVersionId,
        createdId: previousTable.createdId,
        system: previousTable.system,
        createdAt: previousTable.createdAt,
        id: tableId,
        revisions: {
          connect: { id: revisionId },
        },
        rows: {
          connect: previousRows,
        },
      },
    });

    return newTableVersionId;
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

type TableWithDetails = {
  versionId: string;
  createdId: string;
  readonly: boolean;
  system: boolean;
  createdAt: Date;
};
