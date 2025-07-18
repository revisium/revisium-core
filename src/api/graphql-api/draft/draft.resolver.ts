import { UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { PatchRowInput } from 'src/api/graphql-api/draft/input/patch-row.input';
import { PatchRowResultModel } from 'src/api/graphql-api/draft/model/patch-row-result.model';
import { RenameRowResultModel } from 'src/api/graphql-api/draft/model/rename-row-result.model';
import { RenameTableResultModel } from 'src/api/graphql-api/draft/model/rename-table-result.model';
import { UpdateTableResultModel } from 'src/api/graphql-api/draft/model/update-table-result.model';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { GqlJwtAuthGuard } from 'src/features/auth/guards/jwt/gql-jwt-auth-guard.service';
import { PermissionParams } from 'src/features/auth/guards/permission-params';
import { GQLProjectGuard } from 'src/features/auth/guards/project.guard';
import { ApiCreateRowCommand } from 'src/features/draft/commands/impl/api-create-row.command';
import { ApiCreateTableCommand } from 'src/features/draft/commands/impl/api-create-table.command';
import { ApiPatchRowCommand } from 'src/features/draft/commands/impl/api-patch-row.command';
import { ApiRemoveRowCommand } from 'src/features/draft/commands/impl/api-remove-row.command';
import { ApiRemoveTableCommand } from 'src/features/draft/commands/impl/api-remove-table.command';
import { ApiRenameRowCommand } from 'src/features/draft/commands/impl/api-rename-row.command';
import { ApiRenameTableCommand } from 'src/features/draft/commands/impl/api-rename-table.command';
import { ApiUpdateRowCommand } from 'src/features/draft/commands/impl/api-update-row.command';
import { ApiUpdateTableCommand } from 'src/features/draft/commands/impl/api-update-table.command';
import {
  CreateRowInput,
  CreateTableInput,
  RemoveRowInput,
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
  constructor(private readonly commandBus: CommandBus) {}

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.create,
    subject: PermissionSubject.Table,
  })
  @Mutation(() => CreateTableResultModel)
  createTable(@Args('data') data: CreateTableInput) {
    return this.commandBus.execute(new ApiCreateTableCommand(data));
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.delete,
    subject: PermissionSubject.Table,
  })
  @Mutation(() => RemoveTableResultModel)
  async removeTable(@Args('data') data: RemoveTableInput) {
    return this.commandBus.execute(new ApiRemoveTableCommand(data));
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.update,
    subject: PermissionSubject.Table,
  })
  @Mutation(() => UpdateTableResultModel)
  async updateTable(@Args('data') data: UpdateTableInput) {
    return this.commandBus.execute(new ApiUpdateTableCommand(data));
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.update,
    subject: PermissionSubject.Table,
  })
  @Mutation(() => RenameTableResultModel)
  async renameTable(@Args('data') data: RenameTableInput) {
    return this.commandBus.execute(new ApiRenameTableCommand(data));
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.create,
    subject: PermissionSubject.Row,
  })
  @Mutation(() => CreateRowResultModel)
  async createRow(@Args('data') data: CreateRowInput) {
    return this.commandBus.execute(new ApiCreateRowCommand(data));
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.update,
    subject: PermissionSubject.Row,
  })
  @Mutation(() => UpdateRowResultModel)
  async updateRow(@Args('data') data: UpdateRowInput) {
    return this.commandBus.execute(new ApiUpdateRowCommand(data));
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.update,
    subject: PermissionSubject.Row,
  })
  @Mutation(() => PatchRowResultModel)
  async patchRow(@Args('data') data: PatchRowInput) {
    return this.commandBus.execute(new ApiPatchRowCommand(data));
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.update,
    subject: PermissionSubject.Row,
  })
  @Mutation(() => RenameRowResultModel)
  async renameRow(@Args('data') data: RenameRowInput) {
    return this.commandBus.execute(new ApiRenameRowCommand(data));
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.delete,
    subject: PermissionSubject.Row,
  })
  @Mutation(() => RemoveRowResultModel)
  async removeRow(@Args('data') data: RemoveRowInput) {
    return this.commandBus.execute(new ApiRemoveRowCommand(data));
  }
}
