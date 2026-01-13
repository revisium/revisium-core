import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  GetSubSchemaItemsQuery,
  GetSubSchemaItemsQueryData,
  GetSubSchemaItemsQueryReturnType,
} from './queries/impl';

@Injectable()
export class SubSchemaApiService {
  constructor(private readonly queryBus: QueryBus) {}

  public getSubSchemaItems(data: GetSubSchemaItemsQueryData) {
    return this.queryBus.execute<
      GetSubSchemaItemsQuery,
      GetSubSchemaItemsQueryReturnType
    >(new GetSubSchemaItemsQuery(data));
  }
}
