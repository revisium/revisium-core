import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  GetRevisionChangesQuery,
  GetRevisionChangesQueryReturnType,
  GetTableChangesQuery,
  GetTableChangesQueryReturnType,
  GetRowChangesQuery,
  GetRowChangesQueryReturnType,
  GetRowChangesQueryData,
  GetTableChangesQueryData,
  GetRevisionChangesQueryData,
} from './queries/impl';

@Injectable()
export class RevisionChangesApiService {
  constructor(private readonly queryBus: QueryBus) {}

  public revisionChanges(
    data: GetRevisionChangesQueryData,
  ): Promise<GetRevisionChangesQueryReturnType> {
    return this.queryBus.execute<
      GetRevisionChangesQuery,
      GetRevisionChangesQueryReturnType
    >(new GetRevisionChangesQuery(data));
  }

  public tableChanges(
    data: GetTableChangesQueryData,
  ): Promise<GetTableChangesQueryReturnType> {
    return this.queryBus.execute<
      GetTableChangesQuery,
      GetTableChangesQueryReturnType
    >(new GetTableChangesQuery(data));
  }

  public rowChanges(
    data: GetRowChangesQueryData,
  ): Promise<GetRowChangesQueryReturnType> {
    return this.queryBus.execute<
      GetRowChangesQuery,
      GetRowChangesQueryReturnType
    >(new GetRowChangesQuery(data));
  }
}
