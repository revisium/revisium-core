import { UseFilters, UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { PatchRowInput } from 'src/api/graphql-api/draft/input/patch-row.input';
import { PatchRowsInput } from 'src/api/graphql-api/draft/input/patch-rows.input';
import { PatchRowResultModel } from 'src/api/graphql-api/draft/model/patch-row-result.model';
import { PatchRowsResultModel } from 'src/api/graphql-api/draft/model/patch-rows-result.model';
import { RenameRowResultModel } from 'src/api/graphql-api/draft/model/rename-row-result.model';
import { RenameTableResultModel } from 'src/api/graphql-api/draft/model/rename-table-result.model';
import { DeleteRowsResultModel } from 'src/api/graphql-api/draft/model/delete-rows-result.model';
import { UpdateTableResultModel } from 'src/api/graphql-api/draft/model/update-table-result.model';
import { GraphQLValidationExceptionFilter } from 'src/api/graphql-api/filters/graphql-validation-exception.filter';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { GqlJwtAuthGuard } from 'src/features/auth/guards/jwt/gql-jwt-auth-guard.service';
import { PermissionParams } from 'src/features/auth/guards/permission-params';
import { GQLProjectGuard } from 'src/features/auth/guards/project.guard';
import { TableApiService } from 'src/features/table/table-api.service';
import { RowApiService } from 'src/features/row/row-api.service';
import {
  CreateRowInput,
  CreateRowsInput,
  CreateTableInput,
  DeleteRowInput,
  DeleteRowsInput,
  DeleteTableInput,
  RenameRowInput,
  RenameTableInput,
  UpdateRowInput,
  UpdateRowsInput,
} from 'src/api/graphql-api/draft/input';
import { UpdateTableInput } from 'src/api/graphql-api/draft/input/update-table.input';
import { CreateRowResultModel } from 'src/api/graphql-api/draft/model/create-row-result.model';
import { CreateRowsResultModel } from 'src/api/graphql-api/draft/model/create-rows-result.model';
import { CreateTableResultModel } from 'src/api/graphql-api/draft/model/create-table-result.model';
import { DeleteRowResultModel } from 'src/api/graphql-api/draft/model/delete-row-result.model';
import { DeleteTableResultModel } from 'src/api/graphql-api/draft/model/delete-table-result.model';
import { UpdateRowResultModel } from 'src/api/graphql-api/draft/model/update-row-result.model';
import { UpdateRowsResultModel } from 'src/api/graphql-api/draft/model/update-rows-result.model';

@UseFilters(GraphQLValidationExceptionFilter)
@PermissionParams({
  action: PermissionAction.read,
  subject: PermissionSubject.Project,
})
@Resolver()
export class DraftResolver {
  constructor(
    private readonly tables: TableApiService,
    private readonly rows: RowApiService,
  ) {}

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.create,
    subject: PermissionSubject.Table,
  })
  @Mutation(() => CreateTableResultModel)
  createTable(@Args('data') data: CreateTableInput) {
    return this.tables.createTable(data);
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.delete,
    subject: PermissionSubject.Table,
  })
  @Mutation(() => DeleteTableResultModel)
  async deleteTable(@Args('data') data: DeleteTableInput) {
    return this.tables.removeTable(data);
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.update,
    subject: PermissionSubject.Table,
  })
  @Mutation(() => UpdateTableResultModel)
  async updateTable(@Args('data') data: UpdateTableInput) {
    return this.tables.updateTable(data);
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.update,
    subject: PermissionSubject.Table,
  })
  @Mutation(() => RenameTableResultModel)
  async renameTable(@Args('data') data: RenameTableInput) {
    return this.tables.renameTable(data);
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.create,
    subject: PermissionSubject.Row,
  })
  @Mutation(() => CreateRowResultModel)
  async createRow(@Args('data') data: CreateRowInput) {
    return this.rows.createRow(data);
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.create,
    subject: PermissionSubject.Row,
  })
  @Mutation(() => CreateRowsResultModel)
  async createRows(@Args('data') data: CreateRowsInput) {
    return this.rows.createRows(data);
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.update,
    subject: PermissionSubject.Row,
  })
  @Mutation(() => UpdateRowResultModel)
  async updateRow(@Args('data') data: UpdateRowInput) {
    return this.rows.updateRow(data);
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.update,
    subject: PermissionSubject.Row,
  })
  @Mutation(() => UpdateRowsResultModel)
  async updateRows(@Args('data') data: UpdateRowsInput) {
    return this.rows.updateRows(data);
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.update,
    subject: PermissionSubject.Row,
  })
  @Mutation(() => PatchRowResultModel)
  async patchRow(@Args('data') data: PatchRowInput) {
    return this.rows.patchRow(data);
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.update,
    subject: PermissionSubject.Row,
  })
  @Mutation(() => PatchRowsResultModel)
  async patchRows(@Args('data') data: PatchRowsInput) {
    return this.rows.patchRows(data);
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.update,
    subject: PermissionSubject.Row,
  })
  @Mutation(() => RenameRowResultModel)
  async renameRow(@Args('data') data: RenameRowInput) {
    return this.rows.renameRow(data);
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.delete,
    subject: PermissionSubject.Row,
  })
  @Mutation(() => DeleteRowResultModel)
  async deleteRow(@Args('data') data: DeleteRowInput) {
    return this.rows.removeRow(data);
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.delete,
    subject: PermissionSubject.Row,
  })
  @Mutation(() => DeleteRowsResultModel)
  async deleteRows(@Args('data') data: DeleteRowsInput) {
    return this.rows.removeRows(data);
  }
}
