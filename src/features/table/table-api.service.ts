import { Injectable } from '@nestjs/common';
import { EngineApiService } from '@revisium/engine';
import {
  GetCountRowsInTableQueryData,
  GetTableQueryData,
  GetTablesQueryData,
  ResolveTableCountForeignKeysByQueryData,
  ResolveTableCountForeignKeysToQueryData,
  ResolveTableForeignKeysByQueryData,
  ResolveTableForeignKeysToQueryData,
  ResolveTableSchemaQueryData,
} from 'src/features/table/queries/impl';

@Injectable()
export class TableApiService {
  constructor(private readonly engine: EngineApiService) {}

  public getTable(data: GetTableQueryData) {
    return this.engine.getTable(data);
  }

  public getCountRowsInTable(data: GetCountRowsInTableQueryData) {
    return this.engine.getCountRowsInTable(data);
  }

  public resolveTableSchema(data: ResolveTableSchemaQueryData) {
    return this.engine.resolveTableSchema(data);
  }

  public resolveTableCountForeignKeysBy(
    data: ResolveTableCountForeignKeysByQueryData,
  ) {
    return this.engine.resolveTableCountForeignKeysBy(data);
  }

  public resolveTableCountForeignKeysTo(
    data: ResolveTableCountForeignKeysToQueryData,
  ) {
    return this.engine.resolveTableCountForeignKeysTo(data);
  }

  public resolveTableForeignKeysBy(data: ResolveTableForeignKeysByQueryData) {
    return this.engine.resolveTableForeignKeysBy(data);
  }

  public resolveTableForeignKeysTo(data: ResolveTableForeignKeysToQueryData) {
    return this.engine.resolveTableForeignKeysTo(data);
  }

  public getTables(data: GetTablesQueryData) {
    return this.engine.getTables(data);
  }
}
