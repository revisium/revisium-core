import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { OptionalGqlJwtAuthGuard } from 'src/features/auth/guards/jwt/optional-gql-jwt-auth-guard.service';
import { GQLProjectGuard } from 'src/features/auth/guards/project.guard';
import { PermissionParams } from 'src/features/auth/guards/permission-params';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { GetRevisionChangesInput } from './input/get-revision-changes.input';
import { GetRowChangesInput } from './input/get-row-changes.input';
import { GetTableChangesInput } from './input/get-table-changes.input';
import {
  RevisionChangesModel,
  RowChangesConnection,
  TableChangesConnection,
} from './model';
import { RevisionsApiService } from 'src/features/revision/revisions-api.service';
import { RowApiService } from 'src/features/row/row-api.service';
import { TableApiService } from 'src/features/table/table-api.service';

@PermissionParams({
  action: PermissionAction.read,
  subject: PermissionSubject.Project,
})
@Resolver()
export class RevisionChangesResolver {
  constructor(
    private readonly revisions: RevisionsApiService,
    private readonly rows: RowApiService,
    private readonly tables: TableApiService,
  ) {}

  @UseGuards(OptionalGqlJwtAuthGuard, GQLProjectGuard)
  @Query(() => RevisionChangesModel)
  async revisionChanges(
    @Args('data') data: GetRevisionChangesInput,
  ): Promise<RevisionChangesModel> {
    return this.revisions.revisionChanges(data);
  }

  @UseGuards(OptionalGqlJwtAuthGuard, GQLProjectGuard)
  @Query(() => RowChangesConnection)
  async rowChanges(@Args('data') data: GetRowChangesInput) {
    return this.rows.rowChanges({
      ...data,
      filters: data.filters
        ? {
            ...data.filters,
            changeTypes: data.filters.changeTypes as any,
          }
        : undefined,
    });
  }

  @UseGuards(OptionalGqlJwtAuthGuard, GQLProjectGuard)
  @Query(() => TableChangesConnection)
  async tableChanges(@Args('data') data: GetTableChangesInput) {
    return this.tables.tableChanges({
      ...data,
      filters: data.filters
        ? {
            ...data.filters,
            changeTypes: data.filters.changeTypes as any,
          }
        : undefined,
    });
  }
}
