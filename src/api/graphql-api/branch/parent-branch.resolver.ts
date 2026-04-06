import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ParentBranchModel } from 'src/api/graphql-api/branch/model/parent-branch.model';
import { BranchApiService } from 'src/core/branch/branch-api.service';
import { RevisionApiService } from 'src/core/revision/revision-api.service';

@Resolver(() => ParentBranchModel)
export class ParentBranchResolver {
  constructor(
    private readonly branches: BranchApiService,
    private readonly revisions: RevisionApiService,
  ) {}

  @ResolveField()
  branch(@Parent() parent: ParentBranchModel) {
    return this.branches.getBranchById(parent.branch.id);
  }

  @ResolveField()
  revision(@Parent() parent: ParentBranchModel) {
    return this.revisions.getRevision({ revisionId: parent.revision.id });
  }
}
