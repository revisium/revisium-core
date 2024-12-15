import { UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { PermissionAction, PermissionSubject } from 'src/auth/consts';
import { GqlJwtAuthGuard } from 'src/auth/guards/jwt/gql-jwt-auth-guard.service';
import { PermissionParams } from 'src/auth/guards/permission-params';
import { GQLProjectGuard } from 'src/auth/guards/project.guard';
import { ApiCreateRowCommand } from 'src/draft/commands/impl/api-create-row.command';
import { ApiCreateTableCommand } from 'src/draft/commands/impl/api-create-table.command';
import { ApiRemoveRowCommand } from 'src/draft/commands/impl/api-remove-row.command';
import { ApiRemoveTableCommand } from 'src/draft/commands/impl/api-remove-table.command';
import { ApiUpdateRowCommand } from 'src/draft/commands/impl/api-update-row.command';
import { ApiUpdateTableCommand } from 'src/draft/commands/impl/api-update-table.command';
import {
  CreateRowInput,
  CreateTableInput,
  RemoveRowInput,
  RemoveTableInput,
  UpdateRowInput,
} from 'src/graphql-api/draft/input';
import { UpdateTableInput } from 'src/graphql-api/draft/input/update-table.input';
import { CreateRowResultModel } from 'src/graphql-api/draft/model/create-row-result.model';
import { CreateTableResultModel } from 'src/graphql-api/draft/model/create-table-result.model';
import { RemoveRowResultModel } from 'src/graphql-api/draft/model/remove-row-result.model';
import { RemoveTableResultModel } from 'src/graphql-api/draft/model/remove-table-result.model';
import { UpdateRowResultModel } from 'src/graphql-api/draft/model/update-row-result.model';

@PermissionParams({
  action: PermissionAction.read,
  subject: PermissionSubject.Project,
})
@Resolver()
export class DraftResolver {
  constructor(
    private queryBus: QueryBus,
    private commandBus: CommandBus,
  ) {}

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
  @Mutation(() => UpdateRowResultModel)
  async updateTable(@Args('data') data: UpdateTableInput) {
    return this.commandBus.execute(new ApiUpdateTableCommand(data));
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
    action: PermissionAction.delete,
    subject: PermissionSubject.Row,
  })
  @Mutation(() => RemoveRowResultModel)
  async removeRow(@Args('data') data: RemoveRowInput) {
    return this.commandBus.execute(new ApiRemoveRowCommand(data));
  }
}
