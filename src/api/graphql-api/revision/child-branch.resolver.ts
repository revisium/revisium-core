import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ChildBranchModel } from 'src/api/graphql-api/revision/model/child-branch.model';
import { BranchApiService } from 'src/core/branch/branch-api.service';
import { RevisionApiService } from 'src/core/revision/revision-api.service';

@Resolver(() => ChildBranchModel)
export class ChildBranchResolver {
  constructor(
    private readonly branches: BranchApiService,
    private readonly revisions: RevisionApiService,
  ) {}

  @ResolveField()
  branch(@Parent() parent: ChildBranchModel) {
    return this.branches.getBranchById(parent.branch.id);
  }

  @ResolveField()
  revision(@Parent() parent: ChildBranchModel) {
    return this.revisions.getRevision({ revisionId: parent.revision.id });
  }
}
