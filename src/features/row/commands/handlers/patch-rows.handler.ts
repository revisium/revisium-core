import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';
import { LimitMetric } from 'src/features/billing/limits.interface';
import { RowUpdatedEvent } from 'src/infrastructure/cache';
import { BillingCheckService } from 'src/core/shared/billing-check.service';
import { PatchRowsCommand } from '../impl/patch-rows.command';

@CommandHandler(PatchRowsCommand)
export class PatchRowsHandler implements ICommandHandler<PatchRowsCommand> {
  constructor(
    private readonly engine: EngineApiService,
    private readonly eventBus: EventBus,
    private readonly billingCheck: BillingCheckService,
  ) {}

  async execute({ data }: PatchRowsCommand) {
    await this.billingCheck.check(
      data.revisionId,
      LimitMetric.ROW_VERSIONS,
      data.rows.length,
    );
    const result = await this.engine.patchRows(data);
    const events = data.rows.map(
      (row) => new RowUpdatedEvent(data.revisionId, data.tableId, row.rowId),
    );
    await this.eventBus.publishAll(events);
    return result;
  }
}
