import { UseGuards } from '@nestjs/common';
import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { GqlJwtAuthGuard } from 'src/features/auth/guards/jwt/gql-jwt-auth-guard.service';
import { OptionalGqlJwtAuthGuard } from 'src/features/auth/guards/jwt/optional-gql-jwt-auth-guard.service';
import { PermissionParams } from 'src/features/auth/guards/permission-params';
import { GQLProjectGuard } from 'src/features/auth/guards/project.guard';
import { DraftApiService } from 'src/features/draft/draft-api.service';
import { CreateRevisionInput } from 'src/api/graphql-api/revision/inputs/create-revision.input';
import { GetRevisionTablesInput } from 'src/api/graphql-api/revision/inputs/get-revision-tables.input';
import { GetRevisionInput } from 'src/api/graphql-api/revision/inputs/get-revision.input';
import { RevisionModel } from 'src/api/graphql-api/revision/model/revision.model';
import { RevisionsApiService } from 'src/features/revision';
import { RevisionChangesApiService } from 'src/features/revision-changes/revision-changes-api.service';

@PermissionParams({
  action: PermissionAction.read,
  subject: PermissionSubject.Project,
})
@Resolver(() => RevisionModel)
export class RevisionResolver {
  constructor(
    private readonly revisionApi: RevisionsApiService,
    private readonly revisionChangesApi: RevisionChangesApiService,
    private readonly draftApi: DraftApiService,
  ) {}

  @UseGuards(OptionalGqlJwtAuthGuard, GQLProjectGuard)
  @Query(() => RevisionModel)
  revision(@Args('data') data: GetRevisionInput) {
    return this.revisionApi.revision(data);
  }

  @ResolveField()
  async children(@Parent() revision: RevisionModel) {
    return this.revisionApi.getChildrenByRevision(revision.id);
  }

  @ResolveField()
  async parent(@Parent() revision: RevisionModel) {
    return this.revisionApi.resolveParentByRevision(revision.id);
  }

  @ResolveField()
  async child(@Parent() revision: RevisionModel) {
    return this.revisionApi.resolveChildByRevision(revision.id);
  }

  @ResolveField()
  async childBranches(@Parent() revision: RevisionModel) {
    return this.revisionApi.resolveChildBranchesByRevision(revision.id);
  }

  @ResolveField()
  async tables(
    @Parent() revision: RevisionModel,
    @Args('data') data: GetRevisionTablesInput,
  ) {
    return this.revisionApi.getTablesByRevisionId({
      ...data,
      revisionId: revision.id,
    });
  }

  @ResolveField()
  async branch(@Parent() revision: RevisionModel) {
    return this.revisionApi.resolveBranchByRevision(revision.id);
  }

  @ResolveField()
  async endpoints(@Parent() revision: RevisionModel) {
    return this.revisionApi.getEndpointsByRevisionId(revision.id);
  }

  @ResolveField()
  async migrations(@Parent() revision: RevisionModel) {
    return this.revisionApi.migrations({ revisionId: revision.id });
  }

  @ResolveField()
  async changes(@Parent() revision: RevisionModel) {
    return this.revisionChangesApi.revisionChanges({
      revisionId: revision.id,
    });
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.create,
    subject: PermissionSubject.Revision,
  })
  @Mutation(() => RevisionModel)
  async createRevision(@Args('data') data: CreateRevisionInput) {
    return this.draftApi.apiCreateRevision(data);
  }
}
