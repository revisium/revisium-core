import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { PatchRowInput } from 'src/api/graphql-api/draft/input/patch-row.input';
import { PatchRowResultModel } from 'src/api/graphql-api/draft/model/patch-row-result.model';
import { RenameRowResultModel } from 'src/api/graphql-api/draft/model/rename-row-result.model';
import { RenameTableResultModel } from 'src/api/graphql-api/draft/model/rename-table-result.model';
import { RemoveRowsResultModel } from 'src/api/graphql-api/draft/model/remove-rows-result.model';
import { UpdateTableResultModel } from 'src/api/graphql-api/draft/model/update-table-result.model';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { GqlJwtAuthGuard } from 'src/features/auth/guards/jwt/gql-jwt-auth-guard.service';
import { PermissionParams } from 'src/features/auth/guards/permission-params';
import { GQLProjectGuard } from 'src/features/auth/guards/project.guard';
import { DraftApiService } from 'src/features/draft/draft-api.service';
import {
  CreateRowInput,
  CreateTableInput,
  RemoveRowInput,
  RemoveRowsInput,
  RemoveTableInput,
  RenameRowInput,
  RenameTableInput,
  UpdateRowInput,
} from 'src/api/graphql-api/draft/input';
import { UpdateTableInput } from 'src/api/graphql-api/draft/input/update-table.input';
import { CreateRowResultModel } from 'src/api/graphql-api/draft/model/create-row-result.model';
import { CreateTableResultModel } from 'src/api/graphql-api/draft/model/create-table-result.model';
import { RemoveRowResultModel } from 'src/api/graphql-api/draft/model/remove-row-result.model';
import { RemoveTableResultModel } from 'src/api/graphql-api/draft/model/remove-table-result.model';
import { UpdateRowResultModel } from 'src/api/graphql-api/draft/model/update-row-result.model';

@PermissionParams({
  action: PermissionAction.read,
  subject: PermissionSubject.Project,
})
@Resolver()
export class DraftResolver {
  constructor(private readonly draftApiService: DraftApiService) {}

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.create,
    subject: PermissionSubject.Table,
  })
  @Mutation(() => CreateTableResultModel)
  createTable(@Args('data') data: CreateTableInput) {
    return this.draftApiService.apiCreateTable(data);
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.delete,
    subject: PermissionSubject.Table,
  })
  @Mutation(() => RemoveTableResultModel)
  async removeTable(@Args('data') data: RemoveTableInput) {
    return this.draftApiService.apiRemoveTable(data);
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.update,
    subject: PermissionSubject.Table,
  })
  @Mutation(() => UpdateTableResultModel)
  async updateTable(@Args('data') data: UpdateTableInput) {
    return this.draftApiService.apiUpdateTable(data);
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.update,
    subject: PermissionSubject.Table,
  })
  @Mutation(() => RenameTableResultModel)
  async renameTable(@Args('data') data: RenameTableInput) {
    return this.draftApiService.apiRenameTable(data);
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.create,
    subject: PermissionSubject.Row,
  })
  @Mutation(() => CreateRowResultModel)
  async createRow(@Args('data') data: CreateRowInput) {
    return this.draftApiService.apiCreateRow(data);
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.update,
    subject: PermissionSubject.Row,
  })
  @Mutation(() => UpdateRowResultModel)
  async updateRow(@Args('data') data: UpdateRowInput) {
    return this.draftApiService.apiUpdateRow(data);
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.update,
    subject: PermissionSubject.Row,
  })
  @Mutation(() => PatchRowResultModel)
  async patchRow(@Args('data') data: PatchRowInput) {
    return this.draftApiService.apiPatchRow(data);
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.update,
    subject: PermissionSubject.Row,
  })
  @Mutation(() => RenameRowResultModel)
  async renameRow(@Args('data') data: RenameRowInput) {
    return this.draftApiService.apiRenameRow(data);
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.delete,
    subject: PermissionSubject.Row,
  })
  @Mutation(() => RemoveRowResultModel)
  async removeRow(@Args('data') data: RemoveRowInput) {
    return this.draftApiService.apiRemoveRow(data);
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.delete,
    subject: PermissionSubject.Row,
  })
  @Mutation(() => RemoveRowsResultModel)
  async removeRows(@Args('data') data: RemoveRowsInput) {
    return this.draftApiService.apiRemoveRows(data);
  }
}
