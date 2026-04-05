import { UseGuards } from '@nestjs/common';
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
import { TableViewsDataModel } from 'src/api/graphql-api/views/model/table-views-data.model';
import { CoreEngineApiService } from 'src/core/core-engine-api.service';

@PermissionParams({
  action: PermissionAction.read,
  subject: PermissionSubject.Project,
})
@Resolver(() => TableModel)
export class TableResolver {
  constructor(private readonly engine: CoreEngineApiService) {}

  @UseGuards(OptionalGqlJwtAuthGuard, GQLProjectGuard)
  @Query(() => TableModel, { nullable: true })
  table(@Args('data') data: GetTableInput) {
    return this.engine.getTable(data);
  }

  @UseGuards(OptionalGqlJwtAuthGuard, GQLProjectGuard)
  @Query(() => TablesConnection)
  tables(@Args('data') data: GetTablesInput) {
    return this.engine.getTables(data);
  }

  @ResolveField()
  rows(@Parent() table: TableModel, @Args('data') data: GetTableRowsInput) {
    return this.engine.getRows({
      ...data,
      revisionId: table.context.revisionId,
      tableId: table.id,
    });
  }

  @ResolveField()
  count(@Parent() table: TableModel) {
    return this.engine.getCountRowsInTable({
      tableVersionId: table.versionId,
    });
  }

  @ResolveField()
  schema(@Parent() table: TableModel) {
    return this.engine.resolveTableSchema({
      revisionId: table.context.revisionId,
      tableId: table.id,
    });
  }

  @ResolveField()
  countForeignKeysBy(@Parent() table: TableModel) {
    return this.engine.resolveTableCountForeignKeysBy({
      revisionId: table.context.revisionId,
      tableId: table.id,
    });
  }

  @ResolveField()
  foreignKeysBy(
    @Parent() table: TableModel,
    @Args('data') data: GetTableForeignKeysInput,
  ) {
    return this.engine.resolveTableForeignKeysBy({
      ...data,
      revisionId: table.context.revisionId,
      tableId: table.id,
    });
  }

  @ResolveField()
  countForeignKeysTo(@Parent() table: TableModel) {
    return this.engine.resolveTableCountForeignKeysTo({
      revisionId: table.context.revisionId,
      tableId: table.id,
    });
  }

  @ResolveField()
  foreignKeysTo(
    @Parent() table: TableModel,
    @Args('data') data: GetTableForeignKeysInput,
  ) {
    return this.engine.resolveTableForeignKeysTo({
      ...data,
      revisionId: table.context.revisionId,
      tableId: table.id,
    });
  }

  @ResolveField(() => TableViewsDataModel)
  views(@Parent() table: TableModel) {
    return this.engine.getTableViews({
      revisionId: table.context.revisionId,
      tableId: table.id,
    });
  }
}
