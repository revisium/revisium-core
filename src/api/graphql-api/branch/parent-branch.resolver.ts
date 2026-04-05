import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ParentBranchModel } from 'src/api/graphql-api/branch/model/parent-branch.model';
import { CoreEngineApiService } from 'src/core/core-engine-api.service';

@Resolver(() => ParentBranchModel)
export class ParentBranchResolver {
  constructor(private readonly engine: CoreEngineApiService) {}

  @ResolveField()
  branch(@Parent() parent: ParentBranchModel) {
    return this.engine.getBranchById(parent.branch.id);
  }

  @ResolveField()
  revision(@Parent() parent: ParentBranchModel) {
    return this.engine.getRevision({ revisionId: parent.revision.id });
  }
}
