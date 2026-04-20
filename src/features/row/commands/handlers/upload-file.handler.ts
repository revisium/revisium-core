import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';
import { LimitMetric } from 'src/features/billing/limits.interface';
import { BillingCheckService } from 'src/core/shared/billing-check.service';
import { EndpointNotifierService } from 'src/core/shared/endpoint-notifier.service';
import { RowUpdatedEvent } from 'src/infrastructure/cache';
import { UploadFileCommand } from '../impl/upload-file.command';

@CommandHandler(UploadFileCommand)
export class UploadFileHandler implements ICommandHandler<UploadFileCommand> {
  constructor(
    private readonly engine: EngineApiService,
    private readonly eventBus: EventBus,
    private readonly billingCheck: BillingCheckService,
    private readonly endpointNotifier: EndpointNotifierService,
  ) {}

  async execute({ data }: UploadFileCommand) {
    await this.billingCheck.check(
      data.revisionId,
      LimitMetric.STORAGE_BYTES,
      data.file.size,
    );
    const result = await this.engine.uploadFile(data);
    await this.eventBus.publishAll([
      new RowUpdatedEvent(data.revisionId, data.tableId, data.rowId),
    ]);
    await this.endpointNotifier.notify(data.revisionId);
    return result;
  }
}
