import {
  CommandBus,
  CommandHandler,
  ICommandHandler,
  QueryBus,
} from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';
import {
  ApiCreateProjectCommand,
  ApiCreateProjectCommandReturnType,
  CreateProjectCommand,
} from 'src/features/project/commands/impl';
import { GetProjectByIdQuery } from 'src/features/project/queries/impl';

@CommandHandler(ApiCreateProjectCommand)
export class ApiCreateProjectHandler implements ICommandHandler<
  ApiCreateProjectCommand,
  ApiCreateProjectCommandReturnType
> {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: ApiCreateProjectCommand) {
    const projectId = await this.commandBus.execute<
      CreateProjectCommand,
      string
    >(new CreateProjectCommand(data));

    if (data.fromRevisionId) {
      await this.engine.backfillProjectFileBlobs({ projectId });
    }

    return this.queryBus.execute(new GetProjectByIdQuery({ projectId }));
  }
}
