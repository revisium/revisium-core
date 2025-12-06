import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  ApiCreateRevisionCommand,
  ApiCreateRevisionCommandData,
  ApiCreateRevisionCommandReturnType,
} from 'src/features/draft/commands/impl/api-create-revision.command';
import {
  ApiCreateRowCommand,
  ApiCreateRowCommandData,
} from 'src/features/draft/commands/impl/api-create-row.command';
import {
  ApiCreateTableCommand,
  ApiCreateTableCommandData,
} from 'src/features/draft/commands/impl/api-create-table.command';
import {
  ApiPatchRowCommand,
  ApiPatchRowCommandData,
  ApiPatchRowCommandReturnType,
} from 'src/features/draft/commands/impl/api-patch-row.command';
import {
  ApiRemoveRowCommand,
  ApiRemoveRowCommandData,
} from 'src/features/draft/commands/impl/api-remove-row.command';
import {
  ApiRemoveRowsCommand,
  ApiRemoveRowsCommandData,
} from 'src/features/draft/commands/impl/api-remove-rows.command';
import {
  ApiRemoveTableCommand,
  ApiRemoveTableCommandData,
} from 'src/features/draft/commands/impl/api-remove-table.command';
import {
  ApiRenameRowCommand,
  ApiRenameRowCommandData,
  ApiRenameRowCommandReturnType,
} from 'src/features/draft/commands/impl/api-rename-row.command';
import {
  ApiRenameTableCommand,
  ApiRenameTableCommandData,
  ApiRenameTableCommandReturnType,
} from 'src/features/draft/commands/impl/api-rename-table.command';
import {
  ApiUpdateRowCommand,
  ApiUpdateRowCommandData,
} from 'src/features/draft/commands/impl/api-update-row.command';
import {
  ApiUpdateTableCommand,
  ApiUpdateTableCommandData,
} from 'src/features/draft/commands/impl/api-update-table.command';
import {
  ApiUploadFileCommand,
  ApiUploadFileCommandData,
  ApiUploadFileCommandReturnType,
} from 'src/features/draft/commands/impl/api-upload-file.command';
import {
  ApplyMigrationCommandData,
  ApplyMigrationCommandReturnType,
  ApplyMigrationsCommand,
} from 'src/features/draft/commands/impl/migration';
import { ApiCreateRowHandlerReturnType } from 'src/features/draft/commands/types/api-create-row.handler.types';
import { ApiCreateTableHandlerReturnType } from 'src/features/draft/commands/types/api-create-table.handler.types';
import { ApiRemoveRowHandlerReturnType } from 'src/features/draft/commands/types/api-remove-row.handler.types';
import { ApiRemoveRowsHandlerReturnType } from 'src/features/draft/commands/types/api-remove-rows.handler.types';
import { ApiRemoveTableHandlerReturnType } from 'src/features/draft/commands/types/api-remove-table.handler.types';
import { ApiUpdateRowHandlerReturnType } from 'src/features/draft/commands/types/api-update-row.handler.types';
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

  public apiCreateRow(data: ApiCreateRowCommandData) {
    return this.commandBus.execute<
      ApiCreateRowCommand,
      ApiCreateRowHandlerReturnType
    >(new ApiCreateRowCommand(data));
  }

  public apiUpdateRow(data: ApiUpdateRowCommandData) {
    return this.commandBus.execute<
      ApiUpdateRowCommand,
      ApiUpdateRowHandlerReturnType
    >(new ApiUpdateRowCommand(data));
  }

  public apiPatchRow(data: ApiPatchRowCommandData) {
    return this.commandBus.execute<
      ApiPatchRowCommand,
      ApiPatchRowCommandReturnType
    >(new ApiPatchRowCommand(data));
  }

  public apiRenameRow(data: ApiRenameRowCommandData) {
    return this.commandBus.execute<
      ApiRenameRowCommand,
      ApiRenameRowCommandReturnType
    >(new ApiRenameRowCommand(data));
  }

  public apiRemoveRow(data: ApiRemoveRowCommandData) {
    return this.commandBus.execute<
      ApiRemoveRowCommand,
      ApiRemoveRowHandlerReturnType
    >(new ApiRemoveRowCommand(data));
  }

  public apiRemoveRows(data: ApiRemoveRowsCommandData) {
    return this.commandBus.execute<
      ApiRemoveRowsCommand,
      ApiRemoveRowsHandlerReturnType
    >(new ApiRemoveRowsCommand(data));
  }

  public apiCreateRevision(data: ApiCreateRevisionCommandData) {
    return this.commandBus.execute<
      ApiCreateRevisionCommand,
      ApiCreateRevisionCommandReturnType
    >(new ApiCreateRevisionCommand(data));
  }

  public apiUploadFile(data: ApiUploadFileCommandData) {
    return this.commandBus.execute<
      ApiUploadFileCommand,
      ApiUploadFileCommandReturnType
    >(new ApiUploadFileCommand(data));
  }
}
