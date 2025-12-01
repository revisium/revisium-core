import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { BranchApiService } from 'src/features/branch/branch-api.service';
import { ChildBranchModel } from 'src/api/graphql-api/revision/model/child-branch.model';
import { RevisionsApiService } from 'src/features/revision';

@Resolver(() => ChildBranchModel)
export class ChildBranchResolver {
  constructor(
    private readonly branchApi: BranchApiService,
    private readonly revisionApi: RevisionsApiService,
  ) {}

  @ResolveField()
  branch(@Parent() parent: ChildBranchModel) {
    return this.branchApi.getBranchById(parent.branch.id);
  }

  @ResolveField()
  revision(@Parent() parent: ChildBranchModel) {
    return this.revisionApi.revision({ revisionId: parent.revision.id });
  }
}
