import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  GetCountRowsInTableQuery,
  GetCountRowsInTableQueryData,
  GetCountRowsInTableQueryReturnType,
  GetTableQuery,
  GetTableQueryData,
  GetTableQueryReturnType,
  GetTablesQuery,
  GetTablesQueryData,
  GetTablesQueryReturnType,
  ResolveTableCountForeignKeysByQuery,
  ResolveTableCountForeignKeysByQueryData,
  ResolveTableCountForeignKeysByQueryReturnType,
  ResolveTableCountForeignKeysToQuery,
  ResolveTableCountForeignKeysToQueryData,
  ResolveTableCountForeignKeysToQueryReturnType,
  ResolveTableForeignKeysByQuery,
  ResolveTableForeignKeysByQueryData,
  ResolveTableForeignKeysByQueryReturnType,
  ResolveTableForeignKeysToQuery,
  ResolveTableForeignKeysToQueryData,
  ResolveTableForeignKeysToQueryReturnType,
  ResolveTableSchemaQuery,
  ResolveTableSchemaQueryData,
  ResolveTableSchemaQueryReturnType,
} from 'src/features/table/queries/impl';

@Injectable()
export class TableApiService {
  constructor(private readonly queryBus: QueryBus) {}

  public getTable(data: GetTableQueryData) {
    return this.queryBus.execute<GetTableQuery, GetTableQueryReturnType>(
      new GetTableQuery(data),
    );
  }

  public getCountRowsInTable(data: GetCountRowsInTableQueryData) {
    return this.queryBus.execute<
      GetCountRowsInTableQuery,
      GetCountRowsInTableQueryReturnType
    >(new GetCountRowsInTableQuery(data));
  }

  public resolveTableSchema(data: ResolveTableSchemaQueryData) {
    return this.queryBus.execute<
      ResolveTableSchemaQuery,
      ResolveTableSchemaQueryReturnType
    >(new ResolveTableSchemaQuery(data));
  }

  public resolveTableCountForeignKeysBy(
    data: ResolveTableCountForeignKeysByQueryData,
  ) {
    return this.queryBus.execute<
      ResolveTableCountForeignKeysByQuery,
      ResolveTableCountForeignKeysByQueryReturnType
    >(new ResolveTableCountForeignKeysByQuery(data));
  }

  public resolveTableCountForeignKeysTo(
    data: ResolveTableCountForeignKeysToQueryData,
  ) {
    return this.queryBus.execute<
      ResolveTableCountForeignKeysToQuery,
      ResolveTableCountForeignKeysToQueryReturnType
    >(new ResolveTableCountForeignKeysToQuery(data));
  }

  public resolveTableForeignKeysBy(data: ResolveTableForeignKeysByQueryData) {
    return this.queryBus.execute<
      ResolveTableForeignKeysByQuery,
      ResolveTableForeignKeysByQueryReturnType
    >(new ResolveTableForeignKeysByQuery(data));
  }

  public resolveTableForeignKeysTo(data: ResolveTableForeignKeysToQueryData) {
    return this.queryBus.execute<
      ResolveTableForeignKeysToQuery,
      ResolveTableForeignKeysToQueryReturnType
    >(new ResolveTableForeignKeysToQuery(data));
  }

  public getTables(data: GetTablesQueryData) {
    return this.queryBus.execute<GetTablesQuery, GetTablesQueryReturnType>(
      new GetTablesQuery(data),
    );
  }
}
