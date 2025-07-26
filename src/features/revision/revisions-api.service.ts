import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  GetMigrationsQuery,
  GetMigrationsQueryData,
  GetMigrationsQueryReturnType,
} from 'src/features/revision/queries/impl';

@Injectable()
export class RevisionsApiService {
  constructor(private readonly queryBus: QueryBus) {}

  public migrations(data: GetMigrationsQueryData) {
    return this.queryBus.execute<
      GetMigrationsQuery,
      GetMigrationsQueryReturnType
    >(new GetMigrationsQuery(data));
  }
}
