import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';
import { LimitMetric } from 'src/features/billing/limits.interface';
import { RowCreatedEvent } from 'src/infrastructure/cache';
import { BillingCheckService } from 'src/core/shared/billing-check.service';
import { EndpointNotifierService } from 'src/core/shared/endpoint-notifier.service';
import { CreateRowCommand } from '../impl/create-row.command';

@CommandHandler(CreateRowCommand)
export class CreateRowHandler implements ICommandHandler<CreateRowCommand> {
  constructor(
    private readonly engine: EngineApiService,
    private readonly eventBus: EventBus,
    private readonly billingCheck: BillingCheckService,
    private readonly endpointNotifier: EndpointNotifierService,
  ) {}

  async execute({ data }: CreateRowCommand) {
    await this.billingCheck.check(data.revisionId, LimitMetric.ROW_VERSIONS, 1);
    const result = await this.engine.createRow(data);
    await this.eventBus.publishAll([
      new RowCreatedEvent(data.revisionId, data.tableId, data.rowId),
    ]);
    await this.endpointNotifier.notify(data.revisionId);
    return result;
  }
}
