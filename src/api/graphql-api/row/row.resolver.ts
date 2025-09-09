import { UseGuards } from '@nestjs/common';
import {
  Args,
  Int,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { mapToPrismaOrderBy } from 'src/api/utils/mapToPrismaOrderBy';
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
import { RowApiService } from 'src/features/row/row-api.service';

@PermissionParams({
  action: PermissionAction.read,
  subject: PermissionSubject.Project,
})
@Resolver(() => RowModel)
export class RowResolver {
  constructor(private readonly rowApi: RowApiService) {}

  @UseGuards(OptionalGqlJwtAuthGuard, GQLProjectGuard)
  @Query(() => RowModel, { nullable: true })
  public row(@Args('data') data: GetRowInput) {
    return this.rowApi.getRow(data);
  }

  @UseGuards(OptionalGqlJwtAuthGuard, GQLProjectGuard)
  @Query(() => Int)
  getRowCountForeignKeysTo(@Args('data') data: GetRowCountForeignKeysByInput) {
    return this.rowApi.resolveRowCountForeignKeysTo(data);
  }

  @UseGuards(OptionalGqlJwtAuthGuard, GQLProjectGuard)
  @Query(() => RowsConnection)
  rows(@Args('data') { orderBy, ...data }: GetRowsInput) {
    const prismaOrderBy = mapToPrismaOrderBy(orderBy);

    return this.rowApi.getRows({
      ...data,
      orderBy: prismaOrderBy,
    });
  }

  @ResolveField(() => RowsConnection)
  rowForeignKeysBy(
    @Parent() row: RowModel,
    @Args('data') data: GetRowForeignKeysInput,
  ) {
    return this.rowApi.resolveRowForeignKeysBy({
      revisionId: row.context.revisionId,
      tableId: row.context.tableId,
      rowId: row.id,
      foreignKeyByTableId: data.foreignKeyTableId,
      first: data.first,
      after: data.after,
    });
  }

  @ResolveField(() => Int)
  countForeignKeysTo(@Parent() row: RowModel) {
    return this.rowApi.resolveRowCountForeignKeysTo({
      revisionId: row.context.revisionId,
      tableId: row.context.tableId,
      rowId: row.id,
    });
  }

  @ResolveField(() => RowsConnection)
  rowForeignKeysTo(
    @Parent() row: RowModel,
    @Args('data') data: GetRowForeignKeysInput,
  ) {
    return this.rowApi.resolveRowForeignKeysTo({
      revisionId: row.context.revisionId,
      tableId: row.context.tableId,
      rowId: row.id,
      foreignKeyToTableId: data.foreignKeyTableId,
      first: data.first,
      after: data.after,
    });
  }
}
