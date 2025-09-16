import { QueryBus } from '@nestjs/cqrs';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { GetBranchByIdQuery } from 'src/features/branch/quieries/impl';
import { ChildBranchModel } from 'src/api/graphql-api/revision/model/child-branch.model';
import { RevisionsApiService } from 'src/features/revision';

@Resolver(() => ChildBranchModel)
export class ChildBranchResolver {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly revisionApi: RevisionsApiService,
  ) {}

  @ResolveField()
  branch(@Parent() parent: ChildBranchModel) {
    return this.queryBus.execute(new GetBranchByIdQuery(parent.branch.id));
  }

  @ResolveField()
  revision(@Parent() parent: ChildBranchModel) {
    return this.revisionApi.revision({ revisionId: parent.revision.id });
  }
}
