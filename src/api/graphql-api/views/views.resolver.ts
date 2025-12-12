import { UseFilters, UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GraphQLValidationExceptionFilter } from 'src/api/graphql-api/filters/graphql-validation-exception.filter';
import { GetTableViewsInput } from 'src/api/graphql-api/views/input/get-table-views.input';
import { UpdateTableViewsInput } from 'src/api/graphql-api/views/input/update-table-views.input';
import { TableViewsDataModel } from 'src/api/graphql-api/views/model/table-views-data.model';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { GqlJwtAuthGuard } from 'src/features/auth/guards/jwt/gql-jwt-auth-guard.service';
import { OptionalGqlJwtAuthGuard } from 'src/features/auth/guards/jwt/optional-gql-jwt-auth-guard.service';
import { PermissionParams } from 'src/features/auth/guards/permission-params';
import { GQLProjectGuard } from 'src/features/auth/guards/project.guard';
import { ViewsApiService } from 'src/features/views/views-api.service';
import { TableViewsData } from 'src/features/views/types';

@UseFilters(GraphQLValidationExceptionFilter)
@PermissionParams({
  action: PermissionAction.read,
  subject: PermissionSubject.Project,
})
@Resolver()
export class ViewsResolver {
  constructor(private readonly viewsApiService: ViewsApiService) {}

  @UseGuards(OptionalGqlJwtAuthGuard, GQLProjectGuard)
  @Query(() => TableViewsDataModel)
  tableViews(@Args('data') data: GetTableViewsInput) {
    return this.viewsApiService.getTableViews(data);
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.update,
    subject: PermissionSubject.Row,
  })
  @Mutation(() => TableViewsDataModel)
  async updateTableViews(@Args('data') data: UpdateTableViewsInput) {
    await this.viewsApiService.updateTableViews({
      revisionId: data.revisionId,
      tableId: data.tableId,
      viewsData: data.viewsData as unknown as TableViewsData,
    });

    return this.viewsApiService.getTableViews({
      revisionId: data.revisionId,
      tableId: data.tableId,
    });
  }
}
