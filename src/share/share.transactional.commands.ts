import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { MoveEndpointsCommand } from 'src/share/commands/impl';

@Injectable()
export class ShareTransactionalCommands {
  constructor(private commandBus: CommandBus) {}

  public moveEndpoints(data: { fromRevisionId: string; toRevisionId: string }) {
    return this.commandBus.execute<MoveEndpointsCommand, string[]>(
      new MoveEndpointsCommand(data),
    );
  }
}
