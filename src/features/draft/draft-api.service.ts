import { Injectable } from '@nestjs/common';
import { CoreEngineApiService } from 'src/core/core-engine-api.service';
import { ApiCreateRevisionCommandReturnType } from 'src/features/draft/commands/impl/api-create-revision.command';
import { ApiPatchRowCommandReturnType } from 'src/features/draft/commands/impl/api-patch-row.command';
import { ApiRenameRowCommandReturnType } from 'src/features/draft/commands/impl/api-rename-row.command';
import { ApiRenameTableCommandReturnType } from 'src/features/draft/commands/impl/api-rename-table.command';
import { ApiUploadFileCommandReturnType } from 'src/features/draft/commands/impl/api-upload-file.command';
import { ApplyMigrationCommandReturnType } from 'src/features/draft/commands/impl/migration';
import { ApiCreateRowHandlerReturnType } from 'src/features/draft/commands/types/api-create-row.handler.types';
import { ApiCreateRowsHandlerReturnType } from 'src/features/draft/commands/types/api-create-rows.handler.types';
import { ApiPatchRowsHandlerReturnType } from 'src/features/draft/commands/types/api-patch-rows.handler.types';
import { ApiUpdateRowsHandlerReturnType } from 'src/features/draft/commands/types/api-update-rows.handler.types';
import { ApiCreateTableHandlerReturnType } from 'src/features/draft/commands/types/api-create-table.handler.types';
import { ApiRemoveRowHandlerReturnType } from 'src/features/draft/commands/types/api-remove-row.handler.types';
import { ApiRemoveRowsHandlerReturnType } from 'src/features/draft/commands/types/api-remove-rows.handler.types';
import { ApiRemoveTableHandlerReturnType } from 'src/features/draft/commands/types/api-remove-table.handler.types';
import { ApiUpdateRowHandlerReturnType } from 'src/features/draft/commands/types/api-update-row.handler.types';
import { ApiUpdateTableHandlerReturnType } from 'src/features/draft/commands/types/api-update-table.handler.types';

@Injectable()
export class DraftApiService {
  constructor(private readonly coreEngine: CoreEngineApiService) {}

  public apiCreateTable(data: {
    revisionId: string;
    tableId: string;
    schema: any;
  }): Promise<ApiCreateTableHandlerReturnType> {
    return this.coreEngine.createTable(data) as any;
  }

  public apiUpdateTable(data: {
    revisionId: string;
    tableId: string;
    patches: any;
  }): Promise<ApiUpdateTableHandlerReturnType> {
    return this.coreEngine.updateTable(data) as any;
  }

  public apiRenameTable(data: {
    revisionId: string;
    tableId: string;
    nextTableId: string;
  }): Promise<ApiRenameTableCommandReturnType> {
    return this.coreEngine.renameTable(data) as any;
  }

  public apiRemoveTable(data: {
    revisionId: string;
    tableId: string;
  }): Promise<ApiRemoveTableHandlerReturnType> {
    return this.coreEngine.removeTable(data) as any;
  }

  public applyMigrations(data: {
    revisionId: string;
    migrations: any[];
  }): Promise<ApplyMigrationCommandReturnType> {
    return this.coreEngine.applyMigrations(data) as any;
  }

  public apiCreateRow(data: {
    revisionId: string;
    tableId: string;
    rowId: string;
    data: any;
  }): Promise<ApiCreateRowHandlerReturnType> {
    return this.coreEngine.createRow(data) as any;
  }

  public apiCreateRows(data: {
    revisionId: string;
    tableId: string;
    rows: any[];
    isRestore?: boolean;
  }): Promise<ApiCreateRowsHandlerReturnType> {
    return this.coreEngine.createRows(data) as any;
  }

  public apiUpdateRow(data: {
    revisionId: string;
    tableId: string;
    rowId: string;
    data: any;
  }): Promise<ApiUpdateRowHandlerReturnType> {
    return this.coreEngine.updateRow(data) as any;
  }

  public apiUpdateRows(data: {
    revisionId: string;
    tableId: string;
    rows: any[];
    isRestore?: boolean;
  }): Promise<ApiUpdateRowsHandlerReturnType> {
    return this.coreEngine.updateRows(data) as any;
  }

  public apiPatchRow(data: {
    revisionId: string;
    tableId: string;
    rowId: string;
    patches: any[];
  }): Promise<ApiPatchRowCommandReturnType> {
    return this.coreEngine.patchRow(data) as any;
  }

  public apiPatchRows(data: {
    revisionId: string;
    tableId: string;
    rows: any[];
  }): Promise<ApiPatchRowsHandlerReturnType> {
    return this.coreEngine.patchRows(data) as any;
  }

  public apiRenameRow(data: {
    revisionId: string;
    tableId: string;
    rowId: string;
    nextRowId: string;
  }): Promise<ApiRenameRowCommandReturnType> {
    return this.coreEngine.renameRow(data) as any;
  }

  public apiRemoveRow(data: {
    revisionId: string;
    tableId: string;
    rowId: string;
  }): Promise<ApiRemoveRowHandlerReturnType> {
    return this.coreEngine.removeRow(data) as any;
  }

  public apiRemoveRows(data: {
    revisionId: string;
    tableId: string;
    rowIds: string[];
  }): Promise<ApiRemoveRowsHandlerReturnType> {
    return this.coreEngine.removeRows(data) as any;
  }

  public apiCreateRevision(data: {
    projectId: string;
    branchName: string;
    comment?: string;
  }): Promise<ApiCreateRevisionCommandReturnType> {
    return this.coreEngine.createRevision(data) as any;
  }

  public apiUploadFile(
    data: Parameters<CoreEngineApiService['uploadFile']>[0],
  ): Promise<ApiUploadFileCommandReturnType> {
    return this.coreEngine.uploadFile(data) as any;
  }
}
