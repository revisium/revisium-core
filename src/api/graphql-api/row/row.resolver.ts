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
import { mapToPrismaOrderBy } from 'src/api/graphql-api/share/mapToPrismaOrderBy';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { OptionalGqlJwtAuthGuard } from 'src/features/auth/guards/jwt/optional-gql-jwt-auth-guard.service';
import { PermissionParams } from 'src/features/auth/guards/permission-params';
import { GQLProjectGuard } from 'src/features/auth/guards/project.guard';
import {
  GetRowCountForeignKeysByInput,
  GetRowInput,
  GetRowsInput,
} from 'src/api/graphql-api/row/inputs';
import { GetRowForeignKeysInput } from 'src/api/graphql-api/row/inputs/get-row-foreign-keys.input';
import { RowModel } from 'src/api/graphql-api/row/model/row.model';
import { RowsConnection } from 'src/api/graphql-api/row/model/rows-connection.model';
import {
  GetRowQuery,
  GetRowsQuery,
  ResolveRowCountForeignKeysToQuery,
  ResolveRowForeignKeysByQuery,
  ResolveRowForeignKeysToQuery,
} from 'src/features/row/queries/impl';
import { ResolveRowCountForeignKeysByQuery } from 'src/features/row/queries/impl/resolve-row-count-foreign-keys-by.query';
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
  getRowCountForeignKeysTo(@Args('data') data: GetRowCountForeignKeysByInput) {
    return this.queryBus.execute(new ResolveRowCountForeignKeysByQuery(data));
  }

  @UseGuards(OptionalGqlJwtAuthGuard, GQLProjectGuard)
  @Query(() => RowsConnection)
  rows(@Args('data') { orderBy, ...data }: GetRowsInput) {
    const prismaOrderBy = mapToPrismaOrderBy(orderBy);

    return this.queryBus.execute<GetRowsQuery, GetRowsReturnType>(
      new GetRowsQuery({
        ...data,
        orderBy: prismaOrderBy,
      }),
    );
  }

  @ResolveField(() => RowsConnection)
  rowForeignKeysBy(
    @Parent() row: RowModel,
    @Args('data') data: GetRowForeignKeysInput,
  ) {
    return this.queryBus.execute(
      new ResolveRowForeignKeysByQuery({
        revisionId: row.context.revisionId,
        tableId: row.context.tableId,
        rowId: row.id,
        foreignKeyByTableId: data.foreignKeyTableId,
        first: data.first,
        after: data.after,
      }),
    );
  }

  @ResolveField(() => Int)
  countForeignKeysTo(@Parent() row: RowModel) {
    return this.queryBus.execute(
      new ResolveRowCountForeignKeysToQuery({
        revisionId: row.context.revisionId,
        tableId: row.context.tableId,
        rowId: row.id,
      }),
    );
  }

  @ResolveField(() => RowsConnection)
  rowForeignKeysTo(
    @Parent() row: RowModel,
    @Args('data') data: GetRowForeignKeysInput,
  ) {
    return this.queryBus.execute(
      new ResolveRowForeignKeysToQuery({
        revisionId: row.context.revisionId,
        tableId: row.context.tableId,
        rowId: row.id,
        foreignKeyToTableId: data.foreignKeyTableId,
        first: data.first,
        after: data.after,
      }),
    );
  }
}
