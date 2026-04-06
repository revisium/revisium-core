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
import { TableApiService } from 'src/features/table/table-api.service';
import { RowApiService } from 'src/features/row/row-api.service';

@PermissionParams({
  action: PermissionAction.read,
  subject: PermissionSubject.Project,
})
@Resolver(() => TableModel)
export class TableResolver {
  constructor(
    private readonly coreTables: TableApiService,
    private readonly coreRows: RowApiService,
  ) {}

  @UseGuards(OptionalGqlJwtAuthGuard, GQLProjectGuard)
  @Query(() => TableModel, { nullable: true })
  table(@Args('data') data: GetTableInput) {
    return this.coreTables.getTable(data);
  }

  @UseGuards(OptionalGqlJwtAuthGuard, GQLProjectGuard)
  @Query(() => TablesConnection)
  tables(@Args('data') data: GetTablesInput) {
    return this.coreTables.getTables(data);
  }

  @ResolveField()
  rows(@Parent() table: TableModel, @Args('data') data: GetTableRowsInput) {
    return this.coreRows.getRows({
      ...data,
      revisionId: table.context.revisionId,
      tableId: table.id,
    });
  }

  @ResolveField()
  count(@Parent() table: TableModel) {
    return this.coreRows.getCountRowsInTable({
      tableVersionId: table.versionId,
    });
  }

  @ResolveField()
  schema(@Parent() table: TableModel) {
    return this.coreTables.resolveTableSchema({
      revisionId: table.context.revisionId,
      tableId: table.id,
    });
  }

  @ResolveField()
  countForeignKeysBy(@Parent() table: TableModel) {
    return this.coreTables.resolveTableCountForeignKeysBy({
      revisionId: table.context.revisionId,
      tableId: table.id,
    });
  }

  @ResolveField()
  foreignKeysBy(
    @Parent() table: TableModel,
    @Args('data') data: GetTableForeignKeysInput,
  ) {
    return this.coreTables.resolveTableForeignKeysBy({
      ...data,
      revisionId: table.context.revisionId,
      tableId: table.id,
    });
  }

  @ResolveField()
  countForeignKeysTo(@Parent() table: TableModel) {
    return this.coreTables.resolveTableCountForeignKeysTo({
      revisionId: table.context.revisionId,
      tableId: table.id,
    });
  }

  @ResolveField()
  foreignKeysTo(
    @Parent() table: TableModel,
    @Args('data') data: GetTableForeignKeysInput,
  ) {
    return this.coreTables.resolveTableForeignKeysTo({
      ...data,
      revisionId: table.context.revisionId,
      tableId: table.id,
    });
  }

  @ResolveField(() => TableViewsDataModel)
  views(@Parent() table: TableModel) {
    return this.coreTables.getTableViews({
      revisionId: table.context.revisionId,
      tableId: table.id,
    });
  }
}
