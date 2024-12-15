import { QueryBus } from '@nestjs/cqrs';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { GetBranchByIdQuery } from 'src/branch/quieries/impl';
import { ChildBranchModel } from 'src/graphql-api/revision/model/child-branch.model';
import { GetRevisionQuery } from 'src/revision/queries/impl';

@Resolver(() => ChildBranchModel)
export class ChildBranchResolver {
  constructor(private readonly queryBus: QueryBus) {}

  @ResolveField()
  branch(@Parent() parent: ChildBranchModel) {
    return this.queryBus.execute(new GetBranchByIdQuery(parent.branch.id));
  }

  @ResolveField()
  revision(@Parent() parent: ChildBranchModel) {
    return this.queryBus.execute(
      new GetRevisionQuery({ revisionId: parent.revision.id }),
    );
  }
}
