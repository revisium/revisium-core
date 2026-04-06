import { UseGuards } from '@nestjs/common';
import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { Migration } from '@revisium/schema-toolkit/types';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { GqlJwtAuthGuard } from 'src/features/auth/guards/jwt/gql-jwt-auth-guard.service';
import { OptionalGqlJwtAuthGuard } from 'src/features/auth/guards/jwt/optional-gql-jwt-auth-guard.service';
import { PermissionParams } from 'src/features/auth/guards/permission-params';
import { GQLProjectGuard } from 'src/features/auth/guards/project.guard';
import { ApplyMigrationsInput } from 'src/api/graphql-api/revision/inputs/apply-migrations.input';
import { CreateRevisionInput } from 'src/api/graphql-api/revision/inputs/create-revision.input';
import { GetRevisionTablesInput } from 'src/api/graphql-api/revision/inputs/get-revision-tables.input';
import { GetRevisionInput } from 'src/api/graphql-api/revision/inputs/get-revision.input';
import { ApplyMigrationResultModel } from 'src/api/graphql-api/revision/model/apply-migration-result.model';
import { RevisionModel } from 'src/api/graphql-api/revision/model/revision.model';
import { RevisionsApiService } from 'src/features/revision';
import { ProjectApiService } from 'src/features/project/project-api.service';
import { TableApiService } from 'src/features/table/table-api.service';

@PermissionParams({
  action: PermissionAction.read,
  subject: PermissionSubject.Project,
})
@Resolver(() => RevisionModel)
export class RevisionResolver {
  constructor(
    private readonly revisionApi: RevisionsApiService,
    private readonly projectApi: ProjectApiService,
    private readonly coreTables: TableApiService,
  ) {}

  @UseGuards(OptionalGqlJwtAuthGuard, GQLProjectGuard)
  @Query(() => RevisionModel)
  revision(@Args('data') data: GetRevisionInput) {
    return this.revisionApi.getRevision(data);
  }

  @ResolveField()
  async children(@Parent() revision: RevisionModel) {
    return this.revisionApi.getRevisionChildren(revision.id);
  }

  @ResolveField()
  async parent(@Parent() revision: RevisionModel) {
    return this.revisionApi.getRevisionParent(revision.id);
  }

  @ResolveField()
  async child(@Parent() revision: RevisionModel) {
    return this.revisionApi.getRevisionChild(revision.id);
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
    return this.coreTables.getTablesByRevisionId({
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
    return this.coreTables.getMigrations({ revisionId: revision.id });
  }

  @ResolveField()
  async changes(@Parent() revision: RevisionModel) {
    return this.revisionApi.revisionChanges({
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
    const project = await this.projectApi.getProject({
      organizationId: data.organizationId,
      projectName: data.projectName,
    });
    return this.revisionApi.createRevision({
      projectId: project.id,
      branchName: data.branchName,
      comment: data.comment,
    });
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.create,
    subject: PermissionSubject.Table,
  })
  @Mutation(() => [ApplyMigrationResultModel])
  async applyMigrations(@Args('data') data: ApplyMigrationsInput) {
    return this.coreTables.applyMigrations({
      revisionId: data.revisionId,
      migrations: data.migrations as Migration[],
    });
  }
}
