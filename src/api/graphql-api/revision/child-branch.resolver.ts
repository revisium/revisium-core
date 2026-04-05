import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ChildBranchModel } from 'src/api/graphql-api/revision/model/child-branch.model';
import { CoreEngineApiService } from 'src/core/core-engine-api.service';

@Resolver(() => ChildBranchModel)
export class ChildBranchResolver {
  constructor(private readonly engine: CoreEngineApiService) {}

  @ResolveField()
  branch(@Parent() parent: ChildBranchModel) {
    return this.engine.getBranchById(parent.branch.id);
  }

  @ResolveField()
  revision(@Parent() parent: ChildBranchModel) {
    return this.engine.getRevision({ revisionId: parent.revision.id });
  }
}
