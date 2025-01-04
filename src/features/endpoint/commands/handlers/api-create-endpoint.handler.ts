import {
  CommandBus,
  CommandHandler,
  ICommandHandler,
  QueryBus,
} from '@nestjs/cqrs';
import {
  ApiCreateEndpointCommand,
  CreateEndpointCommand,
} from 'src/features/endpoint/commands/impl';
import { GetCreatedEndpointQuery } from 'src/features/endpoint/queries/impl';

@CommandHandler(ApiCreateEndpointCommand)
export class ApiCreateEndpointHandler
  implements ICommandHandler<ApiCreateEndpointCommand>
{
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  async execute({ data }: ApiCreateEndpointCommand) {
    const endpointId = await this.commandBus.execute<
      CreateEndpointCommand,
      string
    >(new CreateEndpointCommand(data));

    return this.queryBus.execute(
      new GetCreatedEndpointQuery({ id: endpointId }),
    );
  }
}
