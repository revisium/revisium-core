import { ICommandHandler } from '@nestjs/cqrs';
import { ICommand } from '@nestjs/cqrs/dist/interfaces/commands/command.interface';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { DraftContextService } from 'src/features/draft/draft-context.service';

export abstract class DraftHandler<T extends ICommand, Result = unknown>
  implements ICommandHandler<T>
{
  protected constructor(
    protected transactionService: TransactionPrismaService,
    protected draftContext: DraftContextService,
  ) {}

  protected get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute(value: T): Promise<Result> {
    const parentDraftContext = this.draftContext.notSafeContext;
    const result: Result = await this.draftContext.run(() => {
      this.draftContext.mergeParentContext(parentDraftContext);
      return this.handler(value);
    });

    await this.postActions?.(value, result);

    return result;
  }

  protected abstract handler(value: T): Promise<Result>;

  protected postActions?(value: T, result: Result): Promise<void>;
}
