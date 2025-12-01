import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ParentBranchModel } from 'src/api/graphql-api/branch/model/parent-branch.model';
import { BranchApiService } from 'src/features/branch/branch-api.service';
import { RevisionsApiService } from 'src/features/revision';

@Resolver(() => ParentBranchModel)
export class ParentBranchResolver {
  constructor(
    private readonly branchApi: BranchApiService,
    private readonly revisionApi: RevisionsApiService,
  ) {}

  @ResolveField()
  branch(@Parent() parent: ParentBranchModel) {
    return this.branchApi.getBranchById(parent.branch.id);
  }

  @ResolveField()
  revision(@Parent() parent: ParentBranchModel) {
    return this.revisionApi.revision({ revisionId: parent.revision.id });
  }
}
