import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';
import {
  CreateTableCommand,
  UpdateTableCommand,
  RenameTableCommand,
  RemoveTableCommand,
} from './commands/impl';

@Injectable()
export class TableApiService {
  constructor(
    private readonly engine: EngineApiService,
    private readonly commandBus: CommandBus,
  ) {}

  // ---- Passthrough reads ----

  public getTable(...args: Parameters<EngineApiService['getTable']>) {
    return this.engine.getTable(...args);
  }

  public getTables(...args: Parameters<EngineApiService['getTables']>) {
    return this.engine.getTables(...args);
  }

  public getTablesByRevisionId(
    ...args: Parameters<EngineApiService['getTablesByRevisionId']>
  ) {
    return this.engine.getTablesByRevisionId(...args);
  }

  public resolveTableSchema(
    ...args: Parameters<EngineApiService['resolveTableSchema']>
  ) {
    return this.engine.resolveTableSchema(...args);
  }

  public resolveTableForeignKeysBy(
    ...args: Parameters<EngineApiService['resolveTableForeignKeysBy']>
  ) {
    return this.engine.resolveTableForeignKeysBy(...args);
  }

  public resolveTableForeignKeysTo(
    ...args: Parameters<EngineApiService['resolveTableForeignKeysTo']>
  ) {
    return this.engine.resolveTableForeignKeysTo(...args);
  }

  public resolveTableCountForeignKeysBy(
    ...args: Parameters<EngineApiService['resolveTableCountForeignKeysBy']>
  ) {
    return this.engine.resolveTableCountForeignKeysBy(...args);
  }

  public resolveTableCountForeignKeysTo(
    ...args: Parameters<EngineApiService['resolveTableCountForeignKeysTo']>
  ) {
    return this.engine.resolveTableCountForeignKeysTo(...args);
  }

  public getTableViews(...args: Parameters<EngineApiService['getTableViews']>) {
    return this.engine.getTableViews(...args);
  }

  public updateTableViews(
    ...args: Parameters<EngineApiService['updateTableViews']>
  ) {
    return this.engine.updateTableViews(...args);
  }

  public getSubSchemaItems(
    ...args: Parameters<EngineApiService['getSubSchemaItems']>
  ) {
    return this.engine.getSubSchemaItems(...args);
  }

  public getMigrations(...args: Parameters<EngineApiService['getMigrations']>) {
    return this.engine.getMigrations(...args);
  }

  public applyMigrations(
    ...args: Parameters<EngineApiService['applyMigrations']>
  ) {
    return this.engine.applyMigrations(...args);
  }

  public tableChanges(...args: Parameters<EngineApiService['tableChanges']>) {
    return this.engine.tableChanges(...args);
  }

  // ---- Commands ----

  public createTable(data: Parameters<EngineApiService['createTable']>[0]) {
    return this.commandBus.execute(new CreateTableCommand(data));
  }

  public updateTable(data: Parameters<EngineApiService['updateTable']>[0]) {
    return this.commandBus.execute(new UpdateTableCommand(data));
  }

  public renameTable(data: Parameters<EngineApiService['renameTable']>[0]) {
    return this.commandBus.execute(new RenameTableCommand(data));
  }

  public removeTable(data: Parameters<EngineApiService['removeTable']>[0]) {
    return this.commandBus.execute(new RemoveTableCommand(data));
  }
}
