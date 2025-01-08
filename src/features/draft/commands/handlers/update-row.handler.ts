import { CommandHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import { HashService } from 'src/infrastructure/database/hash.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { UpdateRowCommand } from 'src/features/draft/commands/impl/update-row.command';
import { UpdateRowHandlerReturnType } from 'src/features/draft/commands/types/update-row.handler.types';
import { DraftContextService } from 'src/features/draft/draft-context.service';
import { DraftRowRequestDto } from 'src/features/draft/draft-request-dto/row-request.dto';
import { DraftTableRequestDto } from 'src/features/draft/draft-request-dto/table-request.dto';
import { DraftHandler } from 'src/features/draft/draft.handler';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';

@CommandHandler(UpdateRowCommand)
export class UpdateRowHandler extends DraftHandler<
  UpdateRowCommand,
  UpdateRowHandlerReturnType
> {
  constructor(
    protected readonly transactionService: TransactionPrismaService,
    protected readonly draftContext: DraftContextService,
    protected readonly tableRequestDto: DraftTableRequestDto,
    protected readonly rowRequestDto: DraftRowRequestDto,
    protected readonly draftTransactionalCommands: DraftTransactionalCommands,
    protected readonly hashService: HashService,
  ) {
    super(transactionService, draftContext);
  }

  protected async handler({
    data: input,
  }: UpdateRowCommand): Promise<UpdateRowHandlerReturnType> {
    const { revisionId, tableId, rowId, data, skipCheckingNotSystemTable } =
      input;

    await this.draftTransactionalCommands.resolveDraftRevision(revisionId);

    if (!skipCheckingNotSystemTable) {
      await this.draftTransactionalCommands.validateNotSystemTable(tableId);
    }

    await this.draftTransactionalCommands.validateData({
      revisionId,
      tableId,
      rows: [{ rowId, data }],
      skipReferenceValidation: skipCheckingNotSystemTable,
    });

    await this.draftTransactionalCommands.getOrCreateDraftTable(tableId);
    await this.draftTransactionalCommands.getOrCreateDraftRow(rowId);

    await this.updateDraftRow(data);

    return {
      tableVersionId: this.tableRequestDto.versionId,
      previousTableVersionId: this.tableRequestDto.previousVersionId,
      rowVersionId: this.rowRequestDto.versionId,
      previousRowVersionId: this.rowRequestDto.previousVersionId,
    };
  }

  private async updateDraftRow(data: Prisma.InputJsonValue) {
    return this.transaction.row.update({
      where: {
        versionId: this.rowRequestDto.versionId,
      },
      data: {
        data: data,
        hash: await this.hashService.hashObject(data),
      },
      select: {
        versionId: true,
      },
    });
  }
}
