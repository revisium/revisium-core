import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { MoveEndpointsCommand } from 'src/features/share/commands/impl';

@Injectable()
export class ShareTransactionalCommands {
  constructor(private readonly commandBus: CommandBus) {}

  public moveEndpoints(data: { fromRevisionId: string; toRevisionId: string }) {
    return this.commandBus.execute<MoveEndpointsCommand, string[]>(
      new MoveEndpointsCommand(data),
    );
  }
}
