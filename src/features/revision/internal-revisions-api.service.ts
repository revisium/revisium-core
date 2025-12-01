import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  GetChildrenByRevisionQuery,
  GetChildrenByRevisionQueryData,
  GetChildrenByRevisionQueryReturnType,
  GetEndpointsByRevisionIdQuery,
  GetEndpointsByRevisionIdQueryData,
  GetEndpointsByRevisionIdQueryReturnType,
  GetMigrationsQuery,
  GetMigrationsQueryData,
  GetMigrationsQueryReturnType,
  GetRevisionQuery,
  GetRevisionQueryData,
  GetRevisionQueryReturnType,
  GetTablesByRevisionIdQuery,
  GetTablesByRevisionIdQueryData,
  GetTablesByRevisionIdQueryReturnType,
  ResolveBranchByRevisionQuery,
  ResolveBranchByRevisionQueryData,
  ResolveBranchByRevisionQueryReturnType,
  ResolveChildBranchesByRevisionQuery,
  ResolveChildBranchesByRevisionQueryData,
  ResolveChildBranchesByRevisionQueryReturnType,
  ResolveChildByRevisionQuery,
  ResolveChildByRevisionQueryData,
  ResolveChildByRevisionQueryReturnType,
  ResolveParentByRevisionQuery,
  ResolveParentByRevisionQueryData,
  ResolveParentByRevisionQueryReturnType,
} from 'src/features/revision/queries/impl';

@Injectable()
export class InternalRevisionsApiService {
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

  public resolveParentByRevision(data: ResolveParentByRevisionQueryData) {
    return this.queryBus.execute<
      ResolveParentByRevisionQuery,
      ResolveParentByRevisionQueryReturnType
    >(new ResolveParentByRevisionQuery(data));
  }

  public resolveChildByRevision(data: ResolveChildByRevisionQueryData) {
    return this.queryBus.execute<
      ResolveChildByRevisionQuery,
      ResolveChildByRevisionQueryReturnType
    >(new ResolveChildByRevisionQuery(data));
  }

  public resolveChildBranchesByRevision(
    data: ResolveChildBranchesByRevisionQueryData,
  ) {
    return this.queryBus.execute<
      ResolveChildBranchesByRevisionQuery,
      ResolveChildBranchesByRevisionQueryReturnType
    >(new ResolveChildBranchesByRevisionQuery(data));
  }

  public getTablesByRevisionId(data: GetTablesByRevisionIdQueryData) {
    return this.queryBus.execute<
      GetTablesByRevisionIdQuery,
      GetTablesByRevisionIdQueryReturnType
    >(new GetTablesByRevisionIdQuery(data));
  }

  public getEndpointsByRevisionId(data: GetEndpointsByRevisionIdQueryData) {
    return this.queryBus.execute<
      GetEndpointsByRevisionIdQuery,
      GetEndpointsByRevisionIdQueryReturnType
    >(new GetEndpointsByRevisionIdQuery(data));
  }

  public getChildrenByRevision(data: GetChildrenByRevisionQueryData) {
    return this.queryBus.execute<
      GetChildrenByRevisionQuery,
      GetChildrenByRevisionQueryReturnType
    >(new GetChildrenByRevisionQuery(data));
  }

  public resolveBranchByRevision(data: ResolveBranchByRevisionQueryData) {
    return this.queryBus.execute<
      ResolveBranchByRevisionQuery,
      ResolveBranchByRevisionQueryReturnType
    >(new ResolveBranchByRevisionQuery(data));
  }
}
