import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { NotifyEndpointsCommand } from 'src/features/share/commands/impl';

@Injectable()
export class ShareCommands {
  constructor(private commandBus: CommandBus) {}

  public notifyEndpoints(data: { revisionId: string }) {
    return this.commandBus.execute<NotifyEndpointsCommand, void>(
      new NotifyEndpointsCommand(data),
    );
  }
}
