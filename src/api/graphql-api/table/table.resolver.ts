import { UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { OptionalGqlJwtAuthGuard } from 'src/features/auth/guards/jwt/optional-gql-jwt-auth-guard.service';
import { PermissionParams } from 'src/features/auth/guards/permission-params';
import { GQLProjectGuard } from 'src/features/auth/guards/project.guard';
import { GetTableForeignKeysInput } from 'src/api/graphql-api/table/inputs/get-table-foreign-keys.input';
import { GetTableRowsInput } from 'src/api/graphql-api/table/inputs/get-table-rows.input';
import { GetTableInput } from 'src/api/graphql-api/table/inputs/get-table.input';
import { GetTablesInput } from 'src/api/graphql-api/table/inputs/get-tables.input';
import { TablesConnection } from 'src/api/graphql-api/table/model/table-connection.model';
import { TableModel } from 'src/api/graphql-api/table/model/table.model';
import { RowApiService } from 'src/features/row/row-api.service';
import {
  GetCountRowsInTableQuery,
  ResolveTableCountForeignKeysByQuery,
  ResolveTableCountForeignKeysToQuery,
  ResolveTableForeignKeysByQuery,
  ResolveTableForeignKeysToQuery,
  ResolveTableSchemaQuery,
} from 'src/features/table/queries/impl';
import { GetTableQuery } from 'src/features/table/queries/impl/get-table.query';
import { GetTablesQuery } from 'src/features/table/queries/impl/get-tables.query';
import {
  GetTableReturnType,
  GetTablesReturnType,
} from 'src/features/table/queries/types';

@PermissionParams({
  action: PermissionAction.read,
  subject: PermissionSubject.Project,
})
@Resolver(() => TableModel)
export class TableResolver {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly rowApi: RowApiService,
  ) {}

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
    return this.rowApi.getRows({
      revisionId: table.context.revisionId,
      tableId: table.id,
      ...data,
    });
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
  countForeignKeysBy(@Parent() table: TableModel) {
    return this.queryBus.execute(
      new ResolveTableCountForeignKeysByQuery({
        revisionId: table.context.revisionId,
        tableId: table.id,
      }),
    );
  }

  @ResolveField()
  foreignKeysBy(
    @Parent() table: TableModel,
    @Args('data') data: GetTableForeignKeysInput,
  ) {
    return this.queryBus.execute(
      new ResolveTableForeignKeysByQuery({
        revisionId: table.context.revisionId,
        tableId: table.id,
        ...data,
      }),
    );
  }

  @ResolveField()
  countForeignKeysTo(@Parent() table: TableModel) {
    return this.queryBus.execute(
      new ResolveTableCountForeignKeysToQuery({
        revisionId: table.context.revisionId,
        tableId: table.id,
      }),
    );
  }

  @ResolveField()
  foreignKeysTo(
    @Parent() table: TableModel,
    @Args('data') data: GetTableForeignKeysInput,
  ) {
    return this.queryBus.execute(
      new ResolveTableForeignKeysToQuery({
        revisionId: table.context.revisionId,
        tableId: table.id,
        ...data,
      }),
    );
  }
}
