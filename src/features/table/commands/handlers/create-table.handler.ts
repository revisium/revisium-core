import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';
import { LimitMetric } from 'src/features/billing/limits.interface';
import { RowCreatedEvent } from 'src/infrastructure/cache';
import { BillingCheckService } from 'src/core/shared/billing-check.service';
import { EndpointNotifierService } from 'src/core/shared/endpoint-notifier.service';
import { CreateTableCommand } from '../impl/create-table.command';
import { validateSchemaForeignKeys } from './validate-schema-foreign-keys';

@CommandHandler(CreateTableCommand)
export class CreateTableHandler implements ICommandHandler<CreateTableCommand> {
  constructor(
    private readonly engine: EngineApiService,
    private readonly eventBus: EventBus,
    private readonly billingCheck: BillingCheckService,
    private readonly endpointNotifier: EndpointNotifierService,
  ) {}

  async execute({ data }: CreateTableCommand) {
    await this.billingCheck.check(
      data.revisionId,
      LimitMetric.TABLES_PER_REVISION,
      1,
    );
    validateSchemaForeignKeys(data.schema);
    const result = await this.engine.createTable(data);
    await this.eventBus.publishAll([
      new RowCreatedEvent(
        data.revisionId,
        'revisium_schema_table',
        data.tableId,
      ),
    ]);
    await this.endpointNotifier.notify(data.revisionId);
    return result;
  }
}
