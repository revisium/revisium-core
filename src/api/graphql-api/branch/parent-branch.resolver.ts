import { QueryBus } from '@nestjs/cqrs';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ParentBranchModel } from 'src/api/graphql-api/branch/model/parent-branch.model';
import { GetBranchByIdQuery } from 'src/features/branch/quieries/impl';
import { RevisionsApiService } from 'src/features/revision';

@Resolver(() => ParentBranchModel)
export class ParentBranchResolver {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly revisionApi: RevisionsApiService,
  ) {}

  @ResolveField()
  branch(@Parent() parent: ParentBranchModel) {
    return this.queryBus.execute(new GetBranchByIdQuery(parent.branch.id));
  }

  @ResolveField()
  revision(@Parent() parent: ParentBranchModel) {
    return this.revisionApi.revision({ revisionId: parent.revision.id });
  }
}
