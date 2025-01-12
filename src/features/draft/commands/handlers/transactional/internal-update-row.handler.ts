import { CommandHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import {
  InternalUpdateRowCommand,
  InternalUpdateRowCommandReturnType,
} from 'src/features/draft/commands/impl/transactional/internal-update-row.command';
import { HashService } from 'src/infrastructure/database/hash.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { DraftContextService } from 'src/features/draft/draft-context.service';
import { DraftRowRequestDto } from 'src/features/draft/draft-request-dto/row-request.dto';
import { DraftTableRequestDto } from 'src/features/draft/draft-request-dto/table-request.dto';
import { DraftHandler } from 'src/features/draft/draft.handler';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';

@CommandHandler(InternalUpdateRowCommand)
export class InternalUpdateRowHandler extends DraftHandler<
  InternalUpdateRowCommand,
  InternalUpdateRowCommandReturnType
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
  }: InternalUpdateRowCommand): Promise<InternalUpdateRowCommandReturnType> {
    const { revisionId, tableId, rowId, data } = input;

    await this.draftTransactionalCommands.resolveDraftRevision(revisionId);
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