import { QueryBus } from '@nestjs/cqrs';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ParentBranchModel } from 'src/graphql-api/branch/model/parent-branch.model';
import { GetBranchByIdQuery } from 'src/branch/quieries/impl';
import { GetRevisionQuery } from 'src/revision/queries/impl';

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
