import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { OptionalGqlJwtAuthGuard } from 'src/features/auth/guards/jwt/optional-gql-jwt-auth-guard.service';
import { GQLProjectGuard } from 'src/features/auth/guards/project.guard';
import { PermissionParams } from 'src/features/auth/guards/permission-params';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import {
  GetRevisionChangesInput,
  GetRowChangesInput,
  GetTableChangesInput,
} from './input';
import {
  RevisionChangesModel,
  RowChangesConnection,
  TableChangesConnection,
} from './model';
import { RevisionChangesApiService } from 'src/features/revision-changes/revision-changes-api.service';

@PermissionParams({
  action: PermissionAction.read,
  subject: PermissionSubject.Project,
})
@Resolver()
export class RevisionChangesResolver {
  constructor(private readonly api: RevisionChangesApiService) {}

  @UseGuards(OptionalGqlJwtAuthGuard, GQLProjectGuard)
  @Query(() => RevisionChangesModel)
  async revisionChanges(
    @Args('data') data: GetRevisionChangesInput,
  ): Promise<RevisionChangesModel> {
    return this.api.revisionChanges(data);
  }

  @UseGuards(OptionalGqlJwtAuthGuard, GQLProjectGuard)
  @Query(() => RowChangesConnection)
  async rowChanges(@Args('data') data: GetRowChangesInput) {
    return this.api.rowChanges({
      ...data,
      filters: data.filters
        ? {
            ...data.filters,
            changeTypes: data.filters.changeTypes as any,
            changeSources: data.filters.changeSources as any,
          }
        : undefined,
    });
  }

  @UseGuards(OptionalGqlJwtAuthGuard, GQLProjectGuard)
  @Query(() => TableChangesConnection)
  async tableChanges(@Args('data') data: GetTableChangesInput) {
    return this.api.tableChanges({
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
