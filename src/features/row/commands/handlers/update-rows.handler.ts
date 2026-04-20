import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';
import { LimitMetric } from 'src/features/billing/limits.interface';
import { RowUpdatedEvent } from 'src/infrastructure/cache';
import { BillingCheckService } from 'src/core/shared/billing-check.service';
import { UpdateRowsCommand } from '../impl/update-rows.command';

@CommandHandler(UpdateRowsCommand)
export class UpdateRowsHandler implements ICommandHandler<UpdateRowsCommand> {
  constructor(
    private readonly engine: EngineApiService,
    private readonly eventBus: EventBus,
    private readonly billingCheck: BillingCheckService,
  ) {}

  async execute({ data }: UpdateRowsCommand) {
    await this.billingCheck.check(
      data.revisionId,
      LimitMetric.ROW_VERSIONS,
      data.rows.length,
    );
    const result = await this.engine.updateRows(data);
    const events = data.rows.map(
      (row) => new RowUpdatedEvent(data.revisionId, data.tableId, row.rowId),
    );
    await this.eventBus.publishAll(events);
    return result;
  }
}
