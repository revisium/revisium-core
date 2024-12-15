import {
  CommandBus,
  CommandHandler,
  ICommandHandler,
  QueryBus,
} from '@nestjs/cqrs';
import {
  ApiCreateBranchByRevisionIdCommand,
  CreateBranchByRevisionIdCommand,
} from 'src/branch/commands/impl';
import { GetBranchByIdQuery } from 'src/branch/quieries/impl';

@CommandHandler(ApiCreateBranchByRevisionIdCommand)
export class ApiCreateBranchByRevisionIdHandler
  implements ICommandHandler<ApiCreateBranchByRevisionIdCommand>
{
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  async execute({ data }: ApiCreateBranchByRevisionIdCommand) {
    const branchId: string = await this.commandBus.execute(
      new CreateBranchByRevisionIdCommand(data),
    );
    return this.queryBus.execute(new GetBranchByIdQuery(branchId));
  }
}
