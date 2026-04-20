import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';
import { LimitMetric } from 'src/features/billing/limits.interface';
import { RowRenamedEvent } from 'src/infrastructure/cache';
import { BillingCheckService } from 'src/core/shared/billing-check.service';
import { RenameRowCommand } from '../impl/rename-row.command';

@CommandHandler(RenameRowCommand)
export class RenameRowHandler implements ICommandHandler<RenameRowCommand> {
  constructor(
    private readonly engine: EngineApiService,
    private readonly eventBus: EventBus,
    private readonly billingCheck: BillingCheckService,
  ) {}

  async execute({ data }: RenameRowCommand) {
    await this.billingCheck.check(data.revisionId, LimitMetric.ROW_VERSIONS, 1);
    const result = await this.engine.renameRow(data);
    await this.eventBus.publishAll([
      new RowRenamedEvent(
        data.revisionId,
        data.tableId,
        data.rowId,
        data.nextRowId,
      ),
    ]);
    return result;
  }
}
