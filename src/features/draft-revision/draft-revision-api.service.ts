import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  DraftRevisionCommitCommand,
  DraftRevisionCreateRowsCommand,
  DraftRevisionCreateTableCommand,
  DraftRevisionRemoveRowsCommand,
  DraftRevisionRemoveTableCommand,
  DraftRevisionRenameRowsCommand,
  DraftRevisionRenameTableCommand,
  DraftRevisionRevertCommand,
  DraftRevisionUpdateRowsCommand,
} from 'src/features/draft-revision/commands/impl';
import {
  DraftRevisionCommitCommandData,
  DraftRevisionCommitCommandReturnType,
  DraftRevisionCreateRowsCommandData,
  DraftRevisionCreateRowsCommandReturnType,
  DraftRevisionCreateTableCommandData,
  DraftRevisionCreateTableCommandReturnType,
  DraftRevisionRemoveRowsCommandData,
  DraftRevisionRemoveRowsCommandReturnType,
  DraftRevisionRemoveTableCommandData,
  DraftRevisionRemoveTableCommandReturnType,
  DraftRevisionRenameRowsCommandData,
  DraftRevisionRenameRowsCommandReturnType,
  DraftRevisionRenameTableCommandData,
  DraftRevisionRenameTableCommandReturnType,
  DraftRevisionRevertCommandData,
  DraftRevisionRevertCommandReturnType,
  DraftRevisionUpdateRowsCommandData,
  DraftRevisionUpdateRowsCommandReturnType,
} from 'src/features/draft-revision/commands/impl';

@Injectable()
export class DraftRevisionApiService {
  constructor(private readonly commandBus: CommandBus) {}

  public createTable(
    data: DraftRevisionCreateTableCommandData,
  ): Promise<DraftRevisionCreateTableCommandReturnType> {
    return this.commandBus.execute(new DraftRevisionCreateTableCommand(data));
  }

  public removeTable(
    data: DraftRevisionRemoveTableCommandData,
  ): Promise<DraftRevisionRemoveTableCommandReturnType> {
    return this.commandBus.execute(new DraftRevisionRemoveTableCommand(data));
  }

  public renameTable(
    data: DraftRevisionRenameTableCommandData,
  ): Promise<DraftRevisionRenameTableCommandReturnType> {
    return this.commandBus.execute(new DraftRevisionRenameTableCommand(data));
  }

  public createRows(
    data: DraftRevisionCreateRowsCommandData,
  ): Promise<DraftRevisionCreateRowsCommandReturnType> {
    return this.commandBus.execute(new DraftRevisionCreateRowsCommand(data));
  }

  public updateRows(
    data: DraftRevisionUpdateRowsCommandData,
  ): Promise<DraftRevisionUpdateRowsCommandReturnType> {
    return this.commandBus.execute(new DraftRevisionUpdateRowsCommand(data));
  }

  public renameRows(
    data: DraftRevisionRenameRowsCommandData,
  ): Promise<DraftRevisionRenameRowsCommandReturnType> {
    return this.commandBus.execute(new DraftRevisionRenameRowsCommand(data));
  }

  public removeRows(
    data: DraftRevisionRemoveRowsCommandData,
  ): Promise<DraftRevisionRemoveRowsCommandReturnType> {
    return this.commandBus.execute(new DraftRevisionRemoveRowsCommand(data));
  }

  public commit(
    data: DraftRevisionCommitCommandData,
  ): Promise<DraftRevisionCommitCommandReturnType> {
    return this.commandBus.execute(new DraftRevisionCommitCommand(data));
  }

  public revert(
    data: DraftRevisionRevertCommandData,
  ): Promise<DraftRevisionRevertCommandReturnType> {
    return this.commandBus.execute(new DraftRevisionRevertCommand(data));
  }
}
