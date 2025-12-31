import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DraftRevisionRevertCommand } from 'src/features/draft-revision/commands/impl/draft-revision-revert.command';
import { DraftRevisionRevertCommandReturnType } from 'src/features/draft-revision/commands/impl';
import {
  DraftRevisionInternalService,
  DraftRevisionValidationService,
} from 'src/features/draft-revision/services';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@CommandHandler(DraftRevisionRevertCommand)
export class DraftRevisionRevertHandler
  implements ICommandHandler<DraftRevisionRevertCommand>
{
  constructor(
    private readonly transactionService: TransactionPrismaService,
    private readonly validationService: DraftRevisionValidationService,
    private readonly internalService: DraftRevisionInternalService,
  ) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute({
    data,
  }: DraftRevisionRevertCommand): Promise<DraftRevisionRevertCommandReturnType> {
    const { branchId } = data;

    const headRevision =
      await this.internalService.findHeadRevisionOrThrow(branchId);
    const draftRevision =
      await this.internalService.findDraftRevisionOrThrow(branchId);

    this.validationService.ensureHasChanges(draftRevision.hasChanges);

    const headTables = await this.internalService.getRevisionTableVersionIds(
      headRevision.id,
    );
    await this.resetDraftRevision(draftRevision.id, headTables);

    return { draftRevisionId: draftRevision.id };
  }

  private resetDraftRevision(
    revisionId: string,
    tables: { versionId: string }[],
  ): Promise<unknown> {
    return this.transaction.revision.update({
      where: { id: revisionId },
      data: {
        hasChanges: false,
        tables: { set: tables },
      },
    });
  }
}
