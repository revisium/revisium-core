import { QueryBus } from '@nestjs/cqrs';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ParentBranchModel } from 'src/api/graphql-api/branch/model/parent-branch.model';
import { GetBranchByIdQuery } from 'src/features/branch/quieries/impl';
import { GetRevisionQuery } from 'src/features/revision/queries/impl';

@Resolver(() => ParentBranchModel)
export class ParentBranchResolver {
  constructor(private readonly queryBus: QueryBus) {}

  @ResolveField()
  branch(@Parent() parent: ParentBranchModel) {
    return this.queryBus.execute(new GetBranchByIdQuery(parent.branch.id));
  }

  @ResolveField()
  revision(@Parent() parent: ParentBranchModel) {
    return this.queryBus.execute(
      new GetRevisionQuery({ revisionId: parent.revision.id }),
    );
  }
}
