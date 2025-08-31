import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  GetRowByIdQuery,
  GetRowByIdQueryData,
  GetRowByIdQueryReturnType,
  GetRowQuery,
  GetRowQueryData,
  GetRowQueryReturnType,
  GetRowsQuery,
  GetRowsQueryData,
  GetRowsQueryReturnType,
  ResolveRowCountForeignKeysByQuery,
  ResolveRowCountForeignKeysByQueryData,
  ResolveRowCountForeignKeysByQueryReturnType,
  ResolveRowCountForeignKeysToQuery,
  ResolveRowCountForeignKeysToQueryData,
  ResolveRowCountForeignKeysToQueryReturnType,
  ResolveRowForeignKeysByQuery,
  ResolveRowForeignKeysByQueryData,
  ResolveRowForeignKeysByReturnType,
  ResolveRowForeignKeysToQuery,
  ResolveRowForeignKeysToQueryData,
  ResolveRowForeignKeysToReturnType,
} from 'src/features/row/queries/impl';

@Injectable()
export class RowApiService {
  constructor(private readonly queryBus: QueryBus) {}

  public getRow(data: GetRowQueryData) {
    return this.queryBus.execute<GetRowQuery, GetRowQueryReturnType>(
      new GetRowQuery(data),
    );
  }

  public getRowById(data: GetRowByIdQueryData) {
    return this.queryBus.execute<GetRowByIdQuery, GetRowByIdQueryReturnType>(
      new GetRowByIdQuery(data),
    );
  }

  public getRows(data: GetRowsQueryData) {
    return this.queryBus.execute<GetRowsQuery, GetRowsQueryReturnType>(
      new GetRowsQuery(data),
    );
  }

  public resolveRowCountForeignKeysBy(
    data: ResolveRowCountForeignKeysByQueryData,
  ) {
    return this.queryBus.execute<
      ResolveRowCountForeignKeysByQuery,
      ResolveRowCountForeignKeysByQueryReturnType
    >(new ResolveRowCountForeignKeysByQuery(data));
  }

  public resolveRowCountForeignKeysTo(
    data: ResolveRowCountForeignKeysToQueryData,
  ) {
    return this.queryBus.execute<
      ResolveRowCountForeignKeysToQuery,
      ResolveRowCountForeignKeysToQueryReturnType
    >(new ResolveRowCountForeignKeysToQuery(data));
  }

  public resolveRowForeignKeysBy(data: ResolveRowForeignKeysByQueryData) {
    return this.queryBus.execute<
      ResolveRowForeignKeysByQuery,
      ResolveRowForeignKeysByReturnType
    >(new ResolveRowForeignKeysByQuery(data));
  }

  public resolveRowForeignKeysTo(data: ResolveRowForeignKeysToQueryData) {
    return this.queryBus.execute<
      ResolveRowForeignKeysToQuery,
      ResolveRowForeignKeysToReturnType
    >(new ResolveRowForeignKeysToQuery(data));
  }
}
