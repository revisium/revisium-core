import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  ApiCreateTableCommand,
  ApiCreateTableCommandData,
} from 'src/features/draft/commands/impl/api-create-table.command';
import {
  ApiRemoveTableCommand,
  ApiRemoveTableCommandData,
} from 'src/features/draft/commands/impl/api-remove-table.command';
import {
  ApiRenameTableCommand,
  ApiRenameTableCommandData,
  ApiRenameTableCommandReturnType,
} from 'src/features/draft/commands/impl/api-rename-table.command';
import {
  ApiUpdateTableCommand,
  ApiUpdateTableCommandData,
} from 'src/features/draft/commands/impl/api-update-table.command';
import {
  ApplyMigrationCommandData,
  ApplyMigrationCommandReturnType,
  ApplyMigrationsCommand,
} from 'src/features/draft/commands/impl/migration';
import { ApiCreateTableHandlerReturnType } from 'src/features/draft/commands/types/api-create-table.handler.types';
import { ApiRemoveTableHandlerReturnType } from 'src/features/draft/commands/types/api-remove-table.handler.types';
import { ApiUpdateTableHandlerReturnType } from 'src/features/draft/commands/types/api-update-table.handler.types';

@Injectable()
export class DraftApiService {
  constructor(private readonly commandBus: CommandBus) {}

  public apiCreateTable(data: ApiCreateTableCommandData) {
    return this.commandBus.execute<
      ApiCreateTableCommand,
      ApiCreateTableHandlerReturnType
    >(new ApiCreateTableCommand(data));
  }

  public apiUpdateTable(data: ApiUpdateTableCommandData) {
    return this.commandBus.execute<
      ApiUpdateTableCommand,
      ApiUpdateTableHandlerReturnType
    >(new ApiUpdateTableCommand(data));
  }

  public apiRenameTable(data: ApiRenameTableCommandData) {
    return this.commandBus.execute<
      ApiRenameTableCommand,
      ApiRenameTableCommandReturnType
    >(new ApiRenameTableCommand(data));
  }

  public apiRemoveTable(data: ApiRemoveTableCommandData) {
    return this.commandBus.execute<
      ApiRemoveTableCommand,
      ApiRemoveTableHandlerReturnType
    >(new ApiRemoveTableCommand(data));
  }

  public applyMigrations(data: ApplyMigrationCommandData) {
    return this.commandBus.execute<
      ApplyMigrationsCommand,
      ApplyMigrationCommandReturnType
    >(new ApplyMigrationsCommand(data));
  }
}
