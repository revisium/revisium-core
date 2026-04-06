import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';
import { LimitMetric } from 'src/features/billing/limits.interface';
import { BillingCheckService } from 'src/core/shared/billing-check.service';
import { UploadFileCommand } from '../impl/upload-file.command';

@CommandHandler(UploadFileCommand)
export class UploadFileHandler implements ICommandHandler<UploadFileCommand> {
  constructor(
    private readonly engine: EngineApiService,
    private readonly billingCheck: BillingCheckService,
  ) {}

  async execute({ data }: UploadFileCommand) {
    await this.billingCheck.check(data.revisionId, LimitMetric.STORAGE_BYTES);
    return this.engine.uploadFile(data);
  }
}
