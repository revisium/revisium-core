import { UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  Args,
  Int,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { OptionalGqlJwtAuthGuard } from 'src/features/auth/guards/jwt/optional-gql-jwt-auth-guard.service';
import { PermissionParams } from 'src/features/auth/guards/permission-params';
import { GQLProjectGuard } from 'src/features/auth/guards/project.guard';
import {
  GetRowCountReferencesByInput,
  GetRowInput,
  GetRowsInput,
} from 'src/api/graphql-api/row/inputs';
import { GetRowReferencesInput } from 'src/api/graphql-api/row/inputs/get-row-references.input';
import { RowModel } from 'src/api/graphql-api/row/model/row.model';
import { RowsConnection } from 'src/api/graphql-api/row/model/rows-connection.model';
import {
  GetRowQuery,
  GetRowsQuery,
  ResolveRowCountReferencesToQuery,
  ResolveRowReferencesByQuery,
  ResolveRowReferencesToQuery,
} from 'src/features/row/queries/impl';
import { ResolveRowCountReferencesByQuery } from 'src/features/row/queries/impl/resolve-row-count-references-by.query';
import { GetRowReturnType } from 'src/features/row/queries/types';
import { GetRowsReturnType } from 'src/features/row/queries/types/get-rows.types';

@PermissionParams({
  action: PermissionAction.read,
  subject: PermissionSubject.Project,
})
@Resolver(() => RowModel)
export class RowResolver {
  constructor(private readonly queryBus: QueryBus) {}

  @UseGuards(OptionalGqlJwtAuthGuard, GQLProjectGuard)
  @Query(() => RowModel, { nullable: true })
  public row(@Args('data') data: GetRowInput) {
    return this.queryBus.execute<GetRowQuery, GetRowReturnType>(
      new GetRowQuery(data),
    );
  }

  @UseGuards(OptionalGqlJwtAuthGuard, GQLProjectGuard)
  @Query(() => Int)
  getRowCountReferencesTo(@Args('data') data: GetRowCountReferencesByInput) {
    return this.queryBus.execute(new ResolveRowCountReferencesByQuery(data));
  }

  @UseGuards(OptionalGqlJwtAuthGuard, GQLProjectGuard)
  @Query(() => RowsConnection)
  rows(@Args('data') data: GetRowsInput) {
    return this.queryBus.execute<GetRowsQuery, GetRowsReturnType>(
      new GetRowsQuery(data),
    );
  }

  @ResolveField(() => RowsConnection)
  rowReferencesBy(
    @Parent() row: RowModel,
    @Args('data') data: GetRowReferencesInput,
  ) {
    return this.queryBus.execute(
      new ResolveRowReferencesByQuery({
        revisionId: row.context.revisionId,
        tableId: row.context.tableId,
        rowId: row.id,
        referenceByTableId: data.referenceTableId,
        first: data.first,
        after: data.after,
      }),
    );
  }

  @ResolveField(() => Int)
  countReferencesTo(@Parent() row: RowModel) {
    return this.queryBus.execute(
      new ResolveRowCountReferencesToQuery({
        revisionId: row.context.revisionId,
        tableId: row.context.tableId,
        rowId: row.id,
      }),
    );
  }

  @ResolveField(() => RowsConnection)
  rowReferencesTo(
    @Parent() row: RowModel,
    @Args('data') data: GetRowReferencesInput,
  ) {
    return this.queryBus.execute(
      new ResolveRowReferencesToQuery({
        revisionId: row.context.revisionId,
        tableId: row.context.tableId,
        rowId: row.id,
        referenceByTableId: data.referenceTableId,
        first: data.first,
        after: data.after,
      }),
    );
  }
}
