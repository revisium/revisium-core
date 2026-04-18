import { Injectable, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';
import { RowCacheService } from 'src/infrastructure/cache/services/row-cache.service';
import { CreateRowCommand } from './commands/impl/create-row.command';
import { CreateRowsCommand } from './commands/impl/create-rows.command';
import { PatchRowCommand } from './commands/impl/patch-row.command';
import { PatchRowsCommand } from './commands/impl/patch-rows.command';
import { RemoveRowCommand } from './commands/impl/remove-row.command';
import { RemoveRowsCommand } from './commands/impl/remove-rows.command';
import { RenameRowCommand } from './commands/impl/rename-row.command';
import { UpdateRowCommand } from './commands/impl/update-row.command';
import { UpdateRowsCommand } from './commands/impl/update-rows.command';
import { UploadFileCommand } from './commands/impl/upload-file.command';

@Injectable()
export class RowApiService {
  private readonly logger = new Logger(RowApiService.name);

  constructor(
    private readonly engine: EngineApiService,
    private readonly commandBus: CommandBus,
    private readonly rowCache: RowCacheService,
  ) {}

  // ---- Cached reads ----

  public getRow(data: Parameters<EngineApiService['getRow']>[0]) {
    return this.rowCache.row(data, () => this.engine.getRow(data));
  }

  public getRowById(data: Parameters<EngineApiService['getRowById']>[0]) {
    return this.rowCache.row(data, () => this.engine.getRowById(data));
  }

  public getRows(data: Parameters<EngineApiService['getRows']>[0]) {
    return this.rowCache.getRows(
      data.revisionId,
      data.tableId,
      data,
      async () => {
        const result = await this.engine.getRows(data);
        void this.warmRowCache(result.edges.map((edge) => edge.node)).catch(
          (e) => {
            this.logger.warn('Row cache warming failed (non-critical)', e);
          },
        );
        return result;
      },
    );
  }

  // ---- Passthrough reads ----

  public searchRows(...args: Parameters<EngineApiService['searchRows']>) {
    return this.engine.searchRows(...args);
  }

  public getCountRowsInTable(
    ...args: Parameters<EngineApiService['getCountRowsInTable']>
  ) {
    return this.engine.getCountRowsInTable(...args);
  }

  public resolveRowForeignKeysBy(
    ...args: Parameters<EngineApiService['resolveRowForeignKeysBy']>
  ) {
    return this.engine.resolveRowForeignKeysBy(...args);
  }

  public resolveRowForeignKeysTo(
    ...args: Parameters<EngineApiService['resolveRowForeignKeysTo']>
  ) {
    return this.engine.resolveRowForeignKeysTo(...args);
  }

  public resolveRowCountForeignKeysBy(
    ...args: Parameters<EngineApiService['resolveRowCountForeignKeysBy']>
  ) {
    return this.engine.resolveRowCountForeignKeysBy(...args);
  }

  public resolveRowCountForeignKeysTo(
    ...args: Parameters<EngineApiService['resolveRowCountForeignKeysTo']>
  ) {
    return this.engine.resolveRowCountForeignKeysTo(...args);
  }

  public rowChanges(...args: Parameters<EngineApiService['rowChanges']>) {
    return this.engine.rowChanges(...args);
  }

  // ---- Commands ----

  public createRow(data: Parameters<EngineApiService['createRow']>[0]) {
    return this.commandBus.execute(new CreateRowCommand(data));
  }

  public createRows(data: Parameters<EngineApiService['createRows']>[0]) {
    return this.commandBus.execute(new CreateRowsCommand(data));
  }

  public updateRow(data: Parameters<EngineApiService['updateRow']>[0]) {
    return this.commandBus.execute(new UpdateRowCommand(data));
  }

  public updateRows(data: Parameters<EngineApiService['updateRows']>[0]) {
    return this.commandBus.execute(new UpdateRowsCommand(data));
  }

  public patchRow(data: Parameters<EngineApiService['patchRow']>[0]) {
    return this.commandBus.execute(new PatchRowCommand(data));
  }

  public patchRows(data: Parameters<EngineApiService['patchRows']>[0]) {
    return this.commandBus.execute(new PatchRowsCommand(data));
  }

  public renameRow(data: Parameters<EngineApiService['renameRow']>[0]) {
    return this.commandBus.execute(new RenameRowCommand(data));
  }

  public removeRow(data: Parameters<EngineApiService['removeRow']>[0]) {
    return this.commandBus.execute(new RemoveRowCommand(data));
  }

  public removeRows(data: Parameters<EngineApiService['removeRows']>[0]) {
    return this.commandBus.execute(new RemoveRowsCommand(data));
  }

  public uploadFile(data: Parameters<EngineApiService['uploadFile']>[0]) {
    return this.commandBus.execute(new UploadFileCommand(data));
  }

  // ---- Private ----

  private async warmRowCache(
    rows: { id: string; context: { revisionId: string; tableId: string } }[],
  ) {
    await Promise.all(
      rows.map((row) =>
        this.rowCache.row({ ...row.context, rowId: row.id }, () =>
          Promise.resolve(row),
        ),
      ),
    );
  }
}
