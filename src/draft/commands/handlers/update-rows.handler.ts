import { BadRequestException } from '@nestjs/common';
import { CommandHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import { TransactionPrismaService } from 'src/database/transaction-prisma.service';
import { UpdateRowsCommand } from 'src/draft/commands/impl/update-rows.command';
import { DraftContextService } from 'src/draft/draft-context.service';
import { DraftRowsRequestDto } from 'src/draft/draft-request-dto/rows-request.dto';
import { DraftTableRequestDto } from 'src/draft/draft-request-dto/table-request.dto';
import { DraftHandler } from 'src/draft/draft.handler';
import { DraftTransactionalCommands } from 'src/draft/draft.transactional.commands';

@CommandHandler(UpdateRowsCommand)
export class UpdateRowsHandler extends DraftHandler<UpdateRowsCommand, void> {
  constructor(
    protected transactionService: TransactionPrismaService,
    protected draftContext: DraftContextService,
    protected tableRequestDto: DraftTableRequestDto,
    protected rowsRequestDto: DraftRowsRequestDto,
    protected draftTransactionalCommands: DraftTransactionalCommands,
  ) {
    super(transactionService, draftContext);
  }

  protected async handler({ data: input }: UpdateRowsCommand) {
    const { revisionId, tableId, rows } = input;

    await this.draftTransactionalCommands.resolveDraftRevision(revisionId);
    await this.draftTransactionalCommands.validateNotSystemTable(tableId);
    await this.draftTransactionalCommands.validateData({
      revisionId,
      tableId,
      tableSchema: input.tableSchema,
      rows: rows,
    });

    await this.draftTransactionalCommands.getOrCreateDraftTable(tableId);
    await this.draftTransactionalCommands.getOrCreateDraftRows(
      rows.map((row) => row.rowId),
    );

    const rowIdToVersionIdMap = new Map<string, string>(
      this.rowsRequestDto.rows.map((row) => [row.id, row.versionId]),
    );

    await Promise.all(
      rows.map((row) => {
        const versionId = rowIdToVersionIdMap.get(row.rowId);
        if (!versionId) {
          throw new BadRequestException('Invalid versionId');
        }

        return this.updateDraftRow(versionId, row.data);
      }),
    );
  }

  private async updateDraftRow(versionId: string, data: Prisma.InputJsonValue) {
    return this.transaction.row.update({
      where: {
        versionId,
      },
      data: {
        data,
      },
      select: {
        versionId: true,
      },
    });
  }
}
