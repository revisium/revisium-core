import {
  CommandBus,
  CommandHandler,
  ICommandHandler,
  QueryBus,
} from '@nestjs/cqrs';
import {
  ApiCreateProjectCommand,
  CreateProjectCommand,
} from 'src/project/commands/impl';
import { GetProjectByIdQuery } from 'src/project/queries/impl';

@CommandHandler(ApiCreateProjectCommand)
export class ApiCreateProjectHandler
  implements ICommandHandler<ApiCreateProjectCommand>
{
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  async execute({ data }: ApiCreateProjectCommand) {
    const projectId = await this.commandBus.execute<
      CreateProjectCommand,
      string
    >(new CreateProjectCommand(data));

    return this.queryBus.execute(new GetProjectByIdQuery({ projectId }));
  }
}
