import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';
import { TableSchemaUpdatedEvent } from 'src/infrastructure/cache';
import { EndpointNotifierService } from 'src/core/shared/endpoint-notifier.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { UpdateTableCommand } from '../impl/update-table.command';
import { validatePatchForeignKeys } from './validate-schema-foreign-keys';

@CommandHandler(UpdateTableCommand)
export class UpdateTableHandler implements ICommandHandler<UpdateTableCommand> {
  constructor(
    private readonly engine: EngineApiService,
    private readonly eventBus: EventBus,
    private readonly endpointNotifier: EndpointNotifierService,
    private readonly prisma: PrismaService,
  ) {}

  async execute({ data }: UpdateTableCommand) {
    validatePatchForeignKeys(data.patches);
    const result = await this.engine.updateTable(data);
    await this.prisma.revision.updateMany({
      where: { id: data.revisionId, hasChanges: false },
      data: { hasChanges: true },
    });
    await this.eventBus.publishAll([
      new TableSchemaUpdatedEvent(data.revisionId, data.tableId),
    ]);
    await this.endpointNotifier.notify(data.revisionId);
    return result;
  }
}
