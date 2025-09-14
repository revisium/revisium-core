import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  GetMigrationsQuery,
  GetMigrationsQueryData,
  GetMigrationsQueryReturnType,
  GetRevisionQuery,
  GetRevisionQueryData,
  GetRevisionQueryReturnType,
} from 'src/features/revision/queries/impl';

@Injectable()
export class RevisionsApiService {
  constructor(private readonly queryBus: QueryBus) {}

  public revision(data: GetRevisionQueryData) {
    return this.queryBus.execute<GetRevisionQuery, GetRevisionQueryReturnType>(
      new GetRevisionQuery(data),
    );
  }

  public migrations(data: GetMigrationsQueryData) {
    return this.queryBus.execute<
      GetMigrationsQuery,
      GetMigrationsQueryReturnType
    >(new GetMigrationsQuery(data));
  }
}
