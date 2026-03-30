import { Inject } from '@nestjs/common';
import { CommandBus, CommandHandler } from '@nestjs/cqrs';
import {
  ILimitsService,
  LimitMetric,
  LIMITS_SERVICE_TOKEN,
} from 'src/features/billing/limits.interface';
import { LimitExceededException } from 'src/features/billing/limit-exceeded.exception';
import {
  RenameRowCommand,
  RenameRowCommandReturnType,
} from 'src/features/draft/commands/impl/rename-row.command';
import {
  InternalRenameRowCommand,
  InternalRenameRowCommandReturnType,
} from 'src/features/draft/commands/impl/transactional/internal-rename-row.command';
import { validateRowId } from 'src/features/share/utils/validateUrlLikeId/validateRowId';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { DraftContextService } from 'src/features/draft/draft-context.service';
import { DraftHandler } from 'src/features/draft/draft.handler';
import { DraftRevisionRequestDto } from 'src/features/draft/draft-request-dto/draft-revision-request.dto';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';

@CommandHandler(RenameRowCommand)
export class RenameRowHandler extends DraftHandler<
  RenameRowCommand,
  RenameRowCommandReturnType
> {
  constructor(
    protected readonly commandBus: CommandBus,
    protected readonly transactionService: TransactionPrismaService,
    protected readonly draftContext: DraftContextService,
    protected readonly draftTransactionalCommands: DraftTransactionalCommands,
    protected readonly revisionRequestDto: DraftRevisionRequestDto,
    @Inject(LIMITS_SERVICE_TOKEN)
    protected readonly limitsService: ILimitsService,
  ) {
    super(transactionService, draftContext);
  }

  protected async handler({
    data: input,
  }: RenameRowCommand): Promise<RenameRowCommandReturnType> {
    const { revisionId, tableId, nextRowId } = input;

    validateRowId(nextRowId);
    await this.draftTransactionalCommands.resolveDraftRevision(revisionId);

    const limitResult = await this.limitsService.checkLimit(
      this.revisionRequestDto.organizationId,
      LimitMetric.ROW_VERSIONS,
      1,
    );
    if (!limitResult.allowed) {
      throw new LimitExceededException(limitResult);
    }

    await this.draftTransactionalCommands.validateNotSystemTable(tableId);

    return this.renameRow(input);
  }

  private renameRow(data: RenameRowCommand['data']) {
    return this.commandBus.execute<
      InternalRenameRowCommand,
      InternalRenameRowCommandReturnType
    >(
      new InternalRenameRowCommand({
        revisionId: data.revisionId,
        tableId: data.tableId,
        rowId: data.rowId,
        nextRowId: data.nextRowId,
      }),
    );
  }
}
