import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ChildBranchModel } from 'src/api/graphql-api/revision/model/child-branch.model';
import { BranchApiService } from 'src/features/branch/branch-api.service';
import { RevisionsApiService } from 'src/features/revision/revisions-api.service';

@Resolver(() => ChildBranchModel)
export class ChildBranchResolver {
  constructor(
    private readonly branches: BranchApiService,
    private readonly revisions: RevisionsApiService,
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
