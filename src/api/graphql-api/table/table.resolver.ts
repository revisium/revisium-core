import { UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { OptionalGqlJwtAuthGuard } from 'src/features/auth/guards/jwt/optional-gql-jwt-auth-guard.service';
import { PermissionParams } from 'src/features/auth/guards/permission-params';
import { GQLProjectGuard } from 'src/features/auth/guards/project.guard';
import { GetTableReferencesInput } from 'src/api/graphql-api/table/inputs/get-table-references.input';
import { GetTableRowsInput } from 'src/api/graphql-api/table/inputs/get-table-rows.input';
import { GetTableInput } from 'src/api/graphql-api/table/inputs/get-table.input';
import { GetTablesInput } from 'src/api/graphql-api/table/inputs/get-tables.input';
import { TablesConnection } from 'src/api/graphql-api/table/model/table-connection.model';
import { TableModel } from 'src/api/graphql-api/table/model/table.model';
import {
  GetCountRowsInTableQuery,
  ResolveTableCountReferencesByQuery,
  ResolveTableCountReferencesToQuery,
  ResolveTableReferencesByQuery,
  ResolveTableReferencesToQuery,
  ResolveTableSchemaQuery,
} from 'src/features/table/queries/impl';
import { GetRowsByTableQuery } from 'src/features/table/queries/impl/get-rows-by-table.query';
import { GetTableQuery } from 'src/features/table/queries/impl/get-table.query';
import { GetTablesQuery } from 'src/features/table/queries/impl/get-tables.query';
import {
  GetTableReturnType,
  GetTableRowsReturnType,
  GetTablesReturnType,
} from 'src/features/table/queries/types';

@PermissionParams({
  action: PermissionAction.read,
  subject: PermissionSubject.Project,
})
@Resolver(() => TableModel)
export class TableResolver {
  constructor(private queryBus: QueryBus) {}

  @UseGuards(OptionalGqlJwtAuthGuard, GQLProjectGuard)
  @Query(() => TableModel, { nullable: true })
  table(@Args('data') data: GetTableInput) {
    return this.queryBus.execute<GetTableQuery, GetTableReturnType>(
      new GetTableQuery(data),
    );
  }

  @UseGuards(OptionalGqlJwtAuthGuard, GQLProjectGuard)
  @Query(() => TablesConnection)
  tables(@Args('data') data: GetTablesInput) {
    return this.queryBus.execute<GetTablesQuery, GetTablesReturnType>(
      new GetTablesQuery(data),
    );
  }

  @ResolveField()
  rows(@Parent() table: TableModel, @Args('data') data: GetTableRowsInput) {
    return this.queryBus.execute<GetRowsByTableQuery, GetTableRowsReturnType>(
      new GetRowsByTableQuery({
        revisionId: table.context.revisionId,
        tableId: table.id,
        tableVersionId: table.versionId,
        ...data,
      }),
    );
  }

  @ResolveField()
  count(@Parent() table: TableModel) {
    return this.queryBus.execute(
      new GetCountRowsInTableQuery({ tableVersionId: table.versionId }),
    );
  }

  @ResolveField()
  schema(@Parent() table: TableModel) {
    return this.queryBus.execute(
      new ResolveTableSchemaQuery({
        revisionId: table.context.revisionId,
        tableId: table.id,
      }),
    );
  }

  @ResolveField()
  countReferencesBy(@Parent() table: TableModel) {
    return this.queryBus.execute(
      new ResolveTableCountReferencesByQuery({
        revisionId: table.context.revisionId,
        tableId: table.id,
      }),
    );
  }

  @ResolveField()
  referencesBy(
    @Parent() table: TableModel,
    @Args('data') data: GetTableReferencesInput,
  ) {
    return this.queryBus.execute(
      new ResolveTableReferencesByQuery({
        revisionId: table.context.revisionId,
        tableId: table.id,
        ...data,
      }),
    );
  }

  @ResolveField()
  countReferencesTo(@Parent() table: TableModel) {
    return this.queryBus.execute(
      new ResolveTableCountReferencesToQuery({
        revisionId: table.context.revisionId,
        tableId: table.id,
      }),
    );
  }

  @ResolveField()
  referencesTo(
    @Parent() table: TableModel,
    @Args('data') data: GetTableReferencesInput,
  ) {
    return this.queryBus.execute(
      new ResolveTableReferencesToQuery({
        revisionId: table.context.revisionId,
        tableId: table.id,
        ...data,
      }),
    );
  }
}
