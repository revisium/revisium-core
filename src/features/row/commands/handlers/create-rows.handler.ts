import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';
import { LimitMetric } from 'src/features/billing/limits.interface';
import { RowCreatedEvent } from 'src/infrastructure/cache';
import { BillingCheckService } from 'src/core/shared/billing-check.service';
import { CreateRowsCommand } from '../impl/create-rows.command';

@CommandHandler(CreateRowsCommand)
export class CreateRowsHandler implements ICommandHandler<CreateRowsCommand> {
  constructor(
    private readonly engine: EngineApiService,
    private readonly eventBus: EventBus,
    private readonly billingCheck: BillingCheckService,
  ) {}

  async execute({ data }: CreateRowsCommand) {
    await this.billingCheck.check(
      data.revisionId,
      LimitMetric.ROW_VERSIONS,
      data.rows.length,
    );
    await this.billingCheck.check(
      data.revisionId,
      LimitMetric.ROWS_PER_TABLE,
      data.rows.length,
      { tableId: data.tableId },
    );
    const result = await this.engine.createRows(data);
    const events = data.rows.map(
      (row) => new RowCreatedEvent(data.revisionId, data.tableId, row.rowId),
    );
    await this.eventBus.publishAll(events);
    return result;
  }
}
