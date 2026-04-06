import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ParentBranchModel } from 'src/api/graphql-api/branch/model/parent-branch.model';
import { BranchApiService } from 'src/features/branch/branch-api.service';
import { RevisionsApiService } from 'src/features/revision/revisions-api.service';

@Resolver(() => ParentBranchModel)
export class ParentBranchResolver {
  constructor(
    private readonly branches: BranchApiService,
    private readonly revisions: RevisionsApiService,
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
