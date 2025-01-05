import {
  CommandBus,
  CommandHandler,
  ICommandHandler,
  QueryBus,
} from '@nestjs/cqrs';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import {
  ApiCreateRevisionCommand,
  ApiCreateRevisionCommandReturnType,
} from 'src/features/draft/commands/impl/api-create-revision.command';
import { CreateRevisionCommand } from 'src/features/draft/commands/impl/create-revision.command';
import { CreateRevisionHandlerReturnType } from 'src/features/draft/commands/types/create-revision.handler.types';
import { EndpointNotificationService } from 'src/infrastructure/notification/endpoint-notification.service';
import { GetRevisionQuery } from 'src/features/revision/queries/impl';

@CommandHandler(ApiCreateRevisionCommand)
export class ApiCreateRevisionHandler
  implements
    ICommandHandler<
      ApiCreateRevisionCommand,
      ApiCreateRevisionCommandReturnType
    >
{
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly transactionService: TransactionPrismaService,
    private readonly endpointNotificationService: EndpointNotificationService,
  ) {}

  async execute({ data }: ApiCreateRevisionCommand) {
    const {
      nextDraftRevisionId,
      draftEndpoints,
      headEndpoints,
    }: CreateRevisionHandlerReturnType = await this.transactionService.run(
      async () =>
        this.commandBus.execute<
          CreateRevisionCommand,
          CreateRevisionHandlerReturnType
        >(new CreateRevisionCommand(data)),
    );

    await this.notifyEndpoints([...draftEndpoints, ...headEndpoints]);

    return this.queryBus.execute(
      new GetRevisionQuery({ revisionId: nextDraftRevisionId }),
    );
  }

  private async notifyEndpoints(endpoints: string[]) {
    for (const endpointId of endpoints) {
      this.endpointNotificationService.update(endpointId);
    }
  }
}
