import { UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
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
import { ApiCreateRevisionCommand } from 'src/features/draft/commands/impl/api-create-revision.command';
import { CreateRevisionInput } from 'src/api/graphql-api/revision/inputs/create-revision.input';
import { GetRevisionTablesInput } from 'src/api/graphql-api/revision/inputs/get-revision-tables.input';
import { GetRevisionInput } from 'src/api/graphql-api/revision/inputs/get-revision.input';
import { RevisionModel } from 'src/api/graphql-api/revision/model/revision.model';
import { RevisionsApiService } from 'src/features/revision';
import {
  GetEndpointsByRevisionIdQuery,
  ResolveChildBranchesByRevisionQuery,
} from 'src/features/revision/queries/impl';
import { ResolveBranchByRevisionQuery } from 'src/features/revision/queries/impl/resolve-branch-by-revision.query';
import { GetChildrenByRevisionQuery } from 'src/features/revision/queries/impl/get-children-by-revision.query';
import { ResolveChildByRevisionQuery } from 'src/features/revision/queries/impl/resolve-child-by-revision.query';
import { ResolveParentByRevisionQuery } from 'src/features/revision/queries/impl/resolve-parent-by-revision.query';
import { GetTablesByRevisionIdQuery } from 'src/features/revision/queries/impl/get-tables-by-revision-id.query';
import { RevisionChangesApiService } from 'src/features/revision-changes/revision-changes-api.service';

@PermissionParams({
  action: PermissionAction.read,
  subject: PermissionSubject.Project,
})
@Resolver(() => RevisionModel)
export class RevisionResolver {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly revisionApi: RevisionsApiService,
    private readonly revisionChangesApi: RevisionChangesApiService,
  ) {}

  @UseGuards(OptionalGqlJwtAuthGuard, GQLProjectGuard)
  @Query(() => RevisionModel)
  revision(@Args('data') data: GetRevisionInput) {
    return this.revisionApi.revision(data);
  }

  @ResolveField()
  async children(@Parent() revision: RevisionModel) {
    return this.queryBus.execute(new GetChildrenByRevisionQuery(revision.id));
  }

  @ResolveField()
  async parent(@Parent() revision: RevisionModel) {
    return this.queryBus.execute(new ResolveParentByRevisionQuery(revision.id));
  }

  @ResolveField()
  async child(@Parent() revision: RevisionModel) {
    return this.queryBus.execute(new ResolveChildByRevisionQuery(revision.id));
  }

  @ResolveField()
  async childBranches(@Parent() revision: RevisionModel) {
    return this.queryBus.execute(
      new ResolveChildBranchesByRevisionQuery(revision.id),
    );
  }

  @ResolveField()
  async tables(
    @Parent() revision: RevisionModel,
    @Args('data') data: GetRevisionTablesInput,
  ) {
    return this.queryBus.execute(
      new GetTablesByRevisionIdQuery({ revisionId: revision.id, ...data }),
    );
  }

  @ResolveField()
  async branch(@Parent() revision: RevisionModel) {
    return this.queryBus.execute(new ResolveBranchByRevisionQuery(revision.id));
  }

  @ResolveField()
  async endpoints(@Parent() revision: RevisionModel) {
    return this.queryBus.execute(
      new GetEndpointsByRevisionIdQuery(revision.id),
    );
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
    return this.commandBus.execute(new ApiCreateRevisionCommand(data));
  }
}
