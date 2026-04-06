import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';
import { LimitMetric } from 'src/features/billing/limits.interface';
import { RowUpdatedEvent } from 'src/infrastructure/cache';
import { BillingCheckService } from 'src/core/shared/billing-check.service';
import { EndpointNotifierService } from 'src/core/shared/endpoint-notifier.service';
import { UpdateRowCommand } from '../impl/update-row.command';

@CommandHandler(UpdateRowCommand)
export class UpdateRowHandler implements ICommandHandler<UpdateRowCommand> {
  constructor(
    private readonly engine: EngineApiService,
    private readonly eventBus: EventBus,
    private readonly billingCheck: BillingCheckService,
    private readonly endpointNotifier: EndpointNotifierService,
  ) {}

  async execute({ data }: UpdateRowCommand) {
    await this.billingCheck.check(data.revisionId, LimitMetric.ROW_VERSIONS, 1);
    const result = await this.engine.updateRow(data);
    await this.eventBus.publishAll([
      new RowUpdatedEvent(data.revisionId, data.tableId, data.rowId),
    ]);
    await this.endpointNotifier.notify(data.revisionId);
    return result;
  }
}
