import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';
import { LimitMetric } from 'src/features/billing/limits.interface';
import { BillingCheckService } from 'src/core/shared/billing-check.service';
import { CreateBranchCommand } from '../impl/create-branch.command';

@CommandHandler(CreateBranchCommand)
export class CreateBranchHandler implements ICommandHandler<CreateBranchCommand> {
  constructor(
    private readonly engine: EngineApiService,
    private readonly billingCheck: BillingCheckService,
  ) {}

  async execute({ data }: CreateBranchCommand) {
    await this.billingCheck.check(
      data.revisionId,
      LimitMetric.BRANCHES_PER_PROJECT,
      1,
    );
    return this.engine.createBranch(data);
  }
}
